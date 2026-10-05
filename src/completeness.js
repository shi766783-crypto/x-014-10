// 档案完整度评分模型
// 每个字段带权重，总和 100；单份档案得分 = 已填写字段的权重之和
export const completenessFields = [
  { key: 'name', label: '证件名称', weight: 10 },
  { key: 'holder', label: '持有人', weight: 10 },
  { key: 'category', label: '证件类别', weight: 5 },
  { key: 'number', label: '证件号码', weight: 15 },
  { key: 'issuer', label: '发证机关', weight: 10 },
  { key: 'issued', label: '签发日期', weight: 5 },
  { key: 'expires', label: '有效期至', weight: 10 },
  { key: 'location', label: '存放位置', weight: 15 },
  { key: 'copyLocation', label: '备份位置', weight: 10 },
  { key: 'photo', label: '照片或扫描件', weight: 10 },
]

export const isFilled = (value) => value != null && String(value).trim() !== ''

// 单份档案：得分 + 缺失字段清单（用于详情页逐条提示）
export function scoreDocument(doc) {
  const missing = completenessFields.filter((field) => !isFilled(doc[field.key]))
  const score = completenessFields.reduce((sum, field) => sum + (isFilled(doc[field.key]) ? field.weight : 0), 0)
  return { score, missing }
}

// 全量档案：整体百分比。分母为零（无档案）时安全返回 0，结果恒在 0-100 之间
export function scoreArchive(documents) {
  const list = Array.isArray(documents) ? documents : []
  const perDoc = list.map((doc) => ({ doc, ...scoreDocument(doc) }))
  const total = perDoc.length * 100
  const earned = perDoc.reduce((sum, item) => sum + item.score, 0)
  const percent = total === 0 ? 0 : Math.min(100, Math.max(0, Math.round((earned / total) * 100)))
  const incomplete = perDoc.filter((item) => item.missing.length > 0).sort((a, b) => a.score - b.score)
  return { percent, earned, total, perDoc, incomplete }
}

// 旧数据规范化：补齐新模型需要的字段键，保证重算口径一致、编辑时字段可绑定
export function normalizeDocument(doc) {
  const normalized = { ...doc }
  for (const field of completenessFields) {
    if (normalized[field.key] === undefined || normalized[field.key] === null) normalized[field.key] = ''
  }
  return normalized
}
