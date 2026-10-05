<script setup>
import { computed, ref, nextTick } from 'vue'
import { Archive, Award, Bell, BookOpen, CalendarClock, ChevronRight, CircleAlert, FilePlus2, FolderLock, LayoutDashboard, ListChecks, Menu, Pencil, Plus, RotateCcw, Search, ShieldCheck, TrendingUp, UserRound, X } from 'lucide-vue-next'
import { config, days } from './data'
import { useKeeper } from './composables/useKeeper'
import { scoreDocuments, scoreDocument, documentFieldGroups } from './services/completeness'
const { state, add, update, metrics, reset } = useKeeper()
const active = ref('overview'); const query = ref(''); const showForm = ref(false); const mobileOpen = ref(false); const draft = ref({})
const detailId = ref(null); const editingId = ref(null); const focusField = ref(null)
const activeNav = computed(() => config.nav.find((x) => x.id === active.value))
const docs = computed(() => state.documents.filter((x) => `${x.name}${x.holder}${x.category}`.toLowerCase().includes(query.value.toLowerCase())))
const alerts = computed(() => state.documents.filter((x) => x.expires).map((x) => ({ ...x, remaining: days(x.expires) })).filter((x) => x.remaining <= 90).sort((a, b) => a.remaining - b.remaining))
const borrowed = computed(() => state.usages.filter((x) => x.status === '借用中'))

// 完整度：所有视图共用这一份计算结果（总览、详情、列表），口径完全一致
const completion = computed(() => scoreDocuments(state.documents))
const scoreOf = (id) => completion.value.perDoc.get(id)?.score ?? 0
const scoreTone = (score) => (score >= 80 ? 'good' : score >= 50 ? 'warn' : 'danger')
const ringColor = (score) => (scoreTone(score) === 'good' ? 'var(--green)' : scoreTone(score) === 'warn' ? 'var(--amber)' : 'var(--coral)')
const ringStyle = (score) => ({ background: `radial-gradient(circle at center,#fff 61%,transparent 62%),conic-gradient(${ringColor(score)} 0 ${score}%,#edf2e8 ${score}% 100%)` })

const detailDoc = computed(() => state.documents.find((x) => x.id === detailId.value) || null)
const detailScore = computed(() => (detailDoc.value ? scoreDocument(detailDoc.value) : null))
const detailGroups = computed(() => (detailDoc.value ? documentFieldGroups(detailDoc.value) : []))

const fieldHint = (field) => field[2] || `请填写${field[1]}`
function emptyDraft() {
  return Object.fromEntries(config.form.fields.map(([key]) => [key, '']).concat([['photo', '']]))
}
function openCreate() { draft.value = emptyDraft(); editingId.value = null; focusField.value = null; showForm.value = true }
function openEdit(id, fieldKey = null) {
  const doc = state.documents.find((x) => x.id === id)
  if (!doc) return
  draft.value = { ...emptyDraft(), ...doc }
  editingId.value = id
  focusField.value = fieldKey
  detailId.value = null
  showForm.value = true
  if (fieldKey) nextTick(() => document.querySelector(`[data-field="${fieldKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}
function openDetail(id) { detailId.value = id }
function closeForm() { showForm.value = false; editingId.value = null; focusField.value = null }
function save() {
  if (editingId.value) update('documents', editingId.value, { ...draft.value })
  else add(config.form.collection, { ...draft.value })
  closeForm()
}
function readFile(event) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { draft.value.photo = reader.result }; reader.readAsDataURL(file) }
function removePhoto() { draft.value.photo = '' }
function markRenewed(doc) { update('documents', doc.id, { expires: `${new Date().getFullYear() + 10}-12-31`, renewed: true }) }
function navTo(id) { active.value = id; mobileOpen.value = false }
</script>
<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ open: mobileOpen }"><div class="brand"><span class="brand-mark"><FolderLock :size="19" /></span><div><strong>{{ config.brand }}</strong><small>{{ config.subtitle }}</small></div><button class="icon-btn close" @click="mobileOpen = false"><X :size="17" /></button></div><div class="family-chip"><span>林</span><div><b>林家家庭空间</b><small>4 位成员 · 私密存储</small></div><ChevronRight :size="15" /></div><nav><button v-for="item in config.nav" :key="item.id" :class="{ active: active === item.id }" @click="navTo(item.id)"><component :is="item.id === 'overview' ? LayoutDashboard : item.id === 'documents' ? Archive : item.id === 'history' ? CalendarClock : item.id === 'insurance' ? ShieldCheck : Award" :size="17" /><span>{{ item.label }}</span><i v-if="item.id === 'documents' && alerts.length">{{ alerts.length }}</i></button></nav><div class="sidebar-foot"><button><BookOpen :size="17" />使用指南</button><button><UserRound :size="17" />个人中心</button><button class="reset" @click="reset"><RotateCcw :size="15" />恢复演示数据</button></div></aside>
    <main class="main"><header class="topbar"><button class="icon-btn menu" @click="mobileOpen = true"><Menu :size="20" /></button><div><span class="eyebrow">家庭文件空间</span><h1>{{ activeNav.label }}</h1></div><div class="top-actions"><button class="icon-btn"><Bell :size="18" /><em v-if="alerts.length"></em></button><span class="avatar">林</span><b>Lin</b></div></header>
      <div class="page">
        <section class="intro"><div><span class="eyebrow">{{ active === 'overview' ? '星期三 · 2026年9月16日' : '数据随时保存在当前设备' }}</span><h2>{{ active === 'overview' ? config.heroTitle : activeNav.label }}</h2><p>{{ active === 'overview' ? config.heroCopy : '集中查看、编辑和追踪家庭资料。' }}</p></div><button class="primary" @click="openCreate"><Plus :size="16" />{{ config.createLabel || '新建档案' }}</button></section>
        <section v-if="active === 'overview'" class="metric-grid"><article v-for="metric in metrics" :key="metric.label" class="metric"><span class="metric-icon" :class="metric.tone"><Archive v-if="metric.tone === 'green'" :size="17" /><CalendarClock v-else-if="metric.tone === 'peach'" :size="17" /><CircleAlert v-else-if="metric.tone === 'red'" :size="17" /><ShieldCheck v-else :size="17" /></span><div><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong><em>{{ metric.tone === 'red' && metric.value ? '需要尽快处理' : metric.tone === 'peach' && metric.value ? '请提前安排续办' : '较上月稳定' }}</em></div></article></section>
        <section v-if="active === 'overview'" class="content-grid"><article class="panel"><div class="panel-head"><div><span class="eyebrow">到期预警</span><h3>需要你留意的文件</h3></div><button class="text-btn" @click="navTo('documents')">查看全部 <ChevronRight :size="14" /></button></div><div class="alert-list"><div v-for="item in alerts.slice(0, 4)" :key="item.id" class="alert-row"><span class="alert-icon" :class="item.remaining < 0 ? 'danger' : 'warn'"><CircleAlert :size="16" /></span><div><b>{{ item.name }}</b><small>{{ item.holder }} · {{ item.location || '存放位置未填写' }}</small></div><span class="date-pill" :class="item.remaining < 0 ? 'danger' : 'warn'">{{ item.remaining < 0 ? `已过期 ${Math.abs(item.remaining)} 天` : `${item.remaining} 天后到期` }}</span><button v-if="item.remaining <= 90" class="tiny-btn" @click="markRenewed(item)">已续办</button></div><div v-if="!alerts.length" class="empty">目前没有临期文件，保持得很好。</div></div></article><article class="panel score"><div class="panel-head"><div><span class="eyebrow">档案完整度</span><h3>家庭资料健康度</h3></div><ListChecks :size="18" class="accent" /></div>
          <template v-if="completion.docsCount">
            <div class="score-ring" :style="ringStyle(completion.score)"><strong :class="`tone-${scoreTone(completion.score)}`">{{ completion.score }}<small>%</small></strong></div>
            <p>按证件号码、照片、发证机关、存放与备份等 10 项关键字段加权评分，缺哪一项都会扣分。</p>
            <div class="progress"><span :class="`tone-${scoreTone(completion.score)}`" :style="{ width: `${completion.score}%` }"></span></div>
            <small class="muted">已补齐字段 {{ completion.filledFields }} / {{ completion.totalFields }} 项 · 满分档案 {{ completion.completeDocs }} / {{ completion.docsCount }} 份</small>
            <div class="fix-list">
              <div class="fix-head"><b>优先补齐</b><button class="text-btn" @click="navTo('documents')">去档案列表 <ChevronRight :size="13" /></button></div>
              <button v-for="item in completion.docsWithMissing.slice(0, 3)" :key="item.doc.id" class="fix-row" @click="openDetail(item.doc.id)">
                <span class="mini-ring" :class="`tone-${scoreTone(item.result.score)}`" :style="{ '--p': item.result.score / 100 }">{{ item.result.score }}</span>
                <div><b>{{ item.doc.name }}</b><small>缺 {{ item.result.missing.map((m) => m.label).slice(0, 3).join('、') }}<template v-if="item.result.missing.length > 3"> 等 {{ item.result.missing.length }} 项</template></small></div>
                <Pencil :size="13" />
              </button>
            </div>
          </template>
          <template v-else>
            <div class="score-ring"><strong>—</strong></div>
            <p>还没有任何档案。新建第一份档案后，完整度会按关键字段自动计算。</p>
            <button class="secondary full" @click="openCreate"><Plus :size="14" />新建第一份档案</button>
          </template>
        </article></section>
        <section v-else-if="active === 'documents'" class="panel"><div class="toolbar"><div class="search"><Search :size="16" /><input v-model="query" :placeholder="`搜索${config.entityLabel}`" /></div><select><option>全部类别</option><option v-for="item in config.categories" :key="item">{{ item }}</option></select></div><div class="table-head"><span>{{ config.entityLabel }}</span><span>类别 / 关联人</span><span>{{ config.dateLabel || '有效期' }}</span><span>{{ config.locationLabel || '存放位置' }}</span><span></span></div><div v-for="item in docs" :key="item.id" class="table-row"><div class="item-title"><span class="file-icon"><Archive :size="16" /></span><div><div class="title-line"><b>{{ item.name }}</b><span class="score-pill" :class="`tone-${scoreTone(scoreOf(item.id))}`">{{ scoreOf(item.id) }}分</span></div><small>{{ item.number || '未填写编号' }}</small></div></div><span><b>{{ item.category }}</b><small>{{ item.holder }}</small></span><span v-if="item.expires"><b :class="{ dangerText: days(item.expires) < 0, warnText: days(item.expires) >= 0 && days(item.expires) <= 90 }">{{ item.expires }}</b><small>{{ days(item.expires) < 0 ? '已过期' : `${config.remainingPrefix || '剩余'} ${days(item.expires)} 天` }}</small></span><span v-else><b class="placeholder">未填写</b><small>有效期缺失会影响完整度</small></span><span><b>{{ item.location || '未填写' }}</b><small>{{ config.copyLabel || '备份位置' }}：{{ item.copyLocation || '未填写' }}</small></span><button class="icon-btn" @click="openDetail(item.id)"><ChevronRight :size="16" /></button></div><div v-if="!docs.length" class="empty">没有匹配的档案。</div></section>
        <section v-else-if="active === 'history'" class="panel"><div class="panel-head"><div><span class="eyebrow">{{ config.historyLabel }}</span><h3>{{ config.historyTitle || `${config.entityLabel}历史` }}</h3></div><span class="count-note">{{ borrowed.length }} 条待处理</span></div><div class="history-grid"><div v-for="entry in state.usages" :key="entry.id" class="history-card"><div class="history-date">{{ entry.date }}<span :class="entry.status === '借用中' ? 'warnText' : 'goodText'">{{ entry.status }}</span></div><b>{{ state.documents.find(x => x.id === entry.documentId)?.name || config.entityLabel }}</b><p>{{ entry.purpose }} · 经办人 {{ entry.borrower }}</p><small>{{ entry.note || '无备注' }}</small></div></div></section>
        <section v-else-if="active === 'insurance'" class="panel"><div class="panel-head"><div><span class="eyebrow">{{ config.secondaryLabel }}</span><h3>{{ config.secondaryTitle || config.secondaryLabel }}</h3></div><button class="text-btn" @click="openCreate">{{ config.secondaryAction || '添加记录' }} <Plus :size="14" /></button></div><div class="policy-grid"><div v-for="item in state.policies" :key="item.id" class="policy-card"><div class="policy-logo"><ShieldCheck :size="20" /></div><div><b>{{ item.type }}</b><small>{{ item.company }} · {{ item.number }}</small></div><span class="policy-date">{{ config.secondaryDatePrefix || '到期' }} {{ item.expires }}</span><strong>{{ item.amount ? `¥${Number(item.amount).toLocaleString()}` : (item.score || '进行中') }} <small>{{ item.payment || item.meta || '' }}</small></strong><p>{{ item.insured || item.description || '已加入家庭计划' }}</p></div></div></section>
        <section v-else class="content-grid"><article class="panel"><div class="panel-head"><div><span class="eyebrow">成长记录</span><h3>成就徽章</h3></div><Award :size="18" class="accent" /></div><div class="badge-grid"><div v-for="(item, index) in config.achievements" :key="item" class="badge" :class="{ unlocked: index < Math.min(5, state.documents.length + 2) }"><span><Award :size="18" /></span><b>{{ item }}</b><small>{{ index < 5 ? '已解锁' : '待解锁' }}</small></div></div></article><article class="panel"><div class="panel-head"><div><span class="eyebrow">家庭榜单</span><h3>档案管理达人</h3></div></div><div class="rank"><b>01</b><span class="rank-avatar">林</span><div><b>林小满</b><small>建档 {{ state.documents.length }} 份 · 处理率 92%</small></div><strong>98</strong></div><div class="rank"><b>02</b><span class="rank-avatar alt">周</span><div><b>周予安</b><small>建档 8 份 · 处理率 88%</small></div><strong>86</strong></div></article></section>
      </div>
    </main>

    <!-- 档案详情：完整度逐项明细，缺失字段逐条提示并可直接补齐 -->
    <div v-if="detailDoc" class="modal-backdrop" @click.self="detailId = null">
      <div class="modal detail-modal">
        <div class="modal-head"><div><span class="eyebrow">档案详情 · 完整度 {{ detailScore.score }} 分</span><h3>{{ detailDoc.name || '未命名档案' }}</h3></div><button type="button" class="icon-btn" @click="detailId = null"><X :size="17" /></button></div>
        <div class="detail-summary" :class="`tone-${scoreTone(detailScore.score)}`">
          <span class="mini-ring large" :class="`tone-${scoreTone(detailScore.score)}`" :style="{ '--p': detailScore.score / 100 }">{{ detailScore.score }}</span>
          <div>
            <b>已填写 {{ detailScore.filled }} / 10 项关键字段</b>
            <small>{{ detailScore.missing.length ? `还有 ${detailScore.missing.length} 项缺失，点击右侧可直接补齐` : '关键字段已全部补齐' }}</small>
          </div>
          <button class="tiny-btn" @click="openEdit(detailDoc.id)"><Pencil :size="11" />编辑档案</button>
        </div>
        <div v-if="detailScore.missing.length" class="missing-banner">
          <div class="fix-head"><b><CircleAlert :size="14" /> 待补齐 ({{ detailScore.missing.length }})</b></div>
          <button v-for="field in detailScore.missing" :key="field.key" class="missing-chip" @click="openEdit(detailDoc.id, field.key)">
            <span class="tier" :class="field.tier.cls">{{ field.tier.label }}</span>{{ field.label }}<em>权重 {{ field.weight }} 分</em><ChevronRight :size="13" />
          </button>
        </div>
        <div class="detail-groups">
          <div v-for="section in detailGroups" :key="section.group" class="detail-group">
            <h4>{{ section.group }}</h4>
            <label v-for="field in section.fields" :key="field.key" :class="{ absent: !field.filled }" @click="field.filled ? null : openEdit(detailDoc.id, field.key)">
              <span class="field-label"><i :class="field.filled ? 'goodText' : 'dangerText'">●</i>{{ field.label }}</span>
              <span class="field-value"><template v-if="field.key === 'photo'">{{ detailDoc.photo ? '已上传照片 / 扫描件' : '未上传' }}</template><template v-else>{{ detailDoc[field.key] || '未填写' }}</template></span>
              <ChevronRight v-if="!field.filled" :size="13" class="field-go" />
            </label>
          </div>
        </div>
        <div v-if="detailDoc.notes" class="detail-note"><b>备注</b><p>{{ detailDoc.notes }}</p></div>
        <div class="modal-actions"><button type="button" class="secondary" @click="detailId = null">关闭</button><button class="primary" @click="openEdit(detailDoc.id)"><Pencil :size="15" />补齐这份档案</button></div>
      </div>
    </div>

    <div v-if="showForm" class="modal-backdrop form-backdrop" @click.self="closeForm"><form class="modal" @submit.prevent="save"><div class="modal-head"><div><span class="eyebrow">{{ editingId ? '修改家庭档案' : '建立家庭档案' }}</span><h3>{{ editingId ? '编辑证件档案' : config.form.title }}</h3></div><button type="button" class="icon-btn" @click="closeForm"><X :size="17" /></button></div><div class="form-grid"><label v-for="field in config.form.fields" :key="field[0]" :data-field="field[0]" :class="{ wide: field[0] === 'notes', focus: focusField === field[0] }">{{ field[1] }}<input v-model="draft[field[0]]" :type="field[3] || 'text'" :placeholder="fieldHint(field)" /></label><label class="wide upload-field" data-field="photo" :class="{ focus: focusField === 'photo' }">照片或扫描件<small class="field-hint">证件正反面 / 关键页扫描，计入完整度评分</small><div class="photo-row"><input type="file" accept="image/*" @change="readFile" /><button v-if="draft.photo" type="button" class="text-btn" @click="removePhoto">移除照片</button></div><img v-if="draft.photo" :src="draft.photo" class="photo-preview" alt="证件照片预览" /><small v-else class="field-hint">支持 JPG、PNG，内容仅保存在本机</small></label></div><div class="modal-actions"><button type="button" class="secondary" @click="closeForm">取消</button><button class="primary" type="submit"><FilePlus2 :size="16" />{{ editingId ? '保存修改' : '保存档案' }}</button></div></form></div>
  </div>
</template>
