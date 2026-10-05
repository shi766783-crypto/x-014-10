import { computed, reactive } from 'vue'
import { createStorage } from '../services/storage'
import { config, seed } from '../data'
import { normalizeDocument } from '../completeness'

const storage = createStorage(config.storageKey, seed)

// 旧数据迁移：补齐新评分模型需要的字段键，缺失的集合补空数组。
// 完整度分数不落库，读取后由新模型即时重算，避免口径切换造成百分比跳变
const migrate = (raw) => {
  const state = raw && typeof raw === 'object' ? raw : {}
  return {
    ...structuredClone(seed),
    ...state,
    documents: Array.isArray(state.documents) ? state.documents.map(normalizeDocument) : [],
    usages: Array.isArray(state.usages) ? state.usages : [],
    policies: Array.isArray(state.policies) ? state.policies : [],
  }
}

export function useKeeper() {
  const raw = storage.read()
  const migrated = migrate(raw)
  if (JSON.stringify(raw) !== JSON.stringify(migrated)) storage.write(migrated)
  const state = reactive(migrated)
  const persist = () => storage.write(state)
  const add = (collection, item) => { state[collection].unshift({ id: `${collection}-${Date.now()}`, createdAt: new Date().toISOString(), ...item }); persist() }
  const update = (collection, id, patch) => { const item = state[collection].find((entry) => entry.id === id); if (item) Object.assign(item, patch); persist() }
  const remove = (collection, id) => { state[collection] = state[collection].filter((entry) => entry.id !== id); persist() }
  const reset = () => { Object.assign(state, migrate(structuredClone(seed))); persist() }
  const metrics = computed(() => config.metrics.map((metric) => ({ ...metric, value: metric.value ? metric.value(state) : state[metric.collection]?.length || 0 })))
  return { state, add, update, remove, reset, persist, metrics }
}
