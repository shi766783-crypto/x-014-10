const collections = ['documents', 'usages', 'policies']

// 归一化：保证已知字段存在（旧数据缺 photo/新字段时为 ''），未知字段原样保留。
// 完整度分数不在此持久化——每次读取后由评分模型实时计算，口径调整后旧数据天然按新模型出分，
// 既不需要批量回填，也不会出现“迁移前 100%、迁移后突然 45%”之类的存储值跳变。
function normalize(data, seed) {
  const result = { ...structuredClone(seed), ...(data || {}) }
  for (const name of collections) {
    if (!Array.isArray(result[name])) result[name] = []
  }
  result.documents = result.documents.map((doc) => ({
    name: '', category: '', holder: '', number: '', issued: '', expires: '',
    issuer: '', location: '', copyLocation: '', notes: '', photo: '',
    ...doc,
  }))
  result.schemaVersion = 2
  return result
}

export function createStorage(key, seed, legacyKeys = []) {
  const read = () => {
    // 1. 优先读取当前版本
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') return normalize(parsed, seed)
      }
    } catch { /* 损坏数据落到迁移/种子逻辑 */ }
    // 2. 从旧版本 key 迁移：取出后写入新 key（归一化后的同一份数据）
    for (const legacyKey of legacyKeys) {
      try {
        const raw = localStorage.getItem(legacyKey)
        if (raw) {
          const migrated = normalize(JSON.parse(raw), seed)
          localStorage.setItem(key, JSON.stringify(migrated))
          localStorage.removeItem(legacyKey)
          return migrated
        }
      } catch { /* 忽略损坏的旧数据 */ }
    }
    // 3. 首次使用：写入演示种子
    const fresh = normalize(structuredClone(seed), seed)
    localStorage.setItem(key, JSON.stringify(fresh))
    return fresh
  }
  const write = (value) => localStorage.setItem(key, JSON.stringify(normalize(value, seed)))
  return { read, write }
}
