// 档案完整度评分模型（全应用唯一口径）
// 总览百分比、进度条、档案详情、列表分数均来自这里，避免多套公式造成数字不一致。
// 字段权重合计 100：号码、照片、存放位置等关键缺失会直接拉低分数，
// 而不是像旧模型那样只要填了存放位置和备份位置就算完整。

export const completenessGroups = ['基础信息', '证面信息', '存放与备份']

export const completenessFields = [
  { key: 'name', label: '证件名称', group: '基础信息', weight: 10 },
  { key: 'holder', label: '持有人', group: '基础信息', weight: 8 },
  { key: 'category', label: '类别', group: '基础信息', weight: 5 },
  { key: 'number', label: '证件号码', group: '证面信息', weight: 12 },
  { key: 'issuer', label: '发证机关', group: '证面信息', weight: 10 },
  { key: 'issued', label: '签发日期', group: '证面信息', weight: 8 },
  { key: 'expires', label: '有效期至', group: '证面信息', weight: 10 },
  { key: 'photo', label: '照片 / 扫描件', group: '证面信息', weight: 15 },
  { key: 'location', label: '存放位置', group: '存放与备份', weight: 12 },
  { key: 'copyLocation', label: '复印件 / 备份位置', group: '存放与备份', weight: 10 },
]

export const totalWeight = completenessFields.reduce((sum, field) => sum + field.weight, 0)

const fieldMap = Object.fromEntries(completenessFields.map((field) => [field.key, field]))

// 字段重要程度，用于详情页逐条提示的标签
export function fieldTier(weight) {
  if (weight >= 12) return { label: '关键', cls: 'danger' }
  if (weight >= 9) return { label: '重要', cls: 'warn' }
  return { label: '基础', cls: 'neutral' }
}

export function isFieldFilled(doc, key) {
  if (key === 'photo') return !!doc?.photo
  return typeof doc?.[key] === 'string' && doc[key].trim().length > 0
}

// 单份档案评分：返回 0-100 的整数分、已得权重、缺失字段明细
export function scoreDocument(doc) {
  const missing = []
  let earned = 0
  for (const field of completenessFields) {
    if (isFieldFilled(doc, field.key)) {
      earned += field.weight
    } else {
      missing.push({ ...field, tier: fieldTier(field.weight) })
    }
  }
  return {
    score: Math.round((earned / totalWeight) * 100),
    earned,
    total: totalWeight,
    filled: completenessFields.length - missing.length,
    missing,
  }
}

// 一批档案的汇总评分：先汇总全部权重再做一次四舍五入，
// 保证总览百分比 = 逐份得分的权重平均，不会出现各视图数字对不上的“跳变”。
export function scoreDocuments(docs) {
  const list = Array.isArray(docs) ? docs : []
  const perDoc = new Map()
  let earned = 0
  const missingCounts = Object.fromEntries(completenessFields.map((f) => [f.key, 0]))
  const docsWithMissing = []
  for (const doc of list) {
    const result = scoreDocument(doc)
    perDoc.set(doc.id, result)
    earned += result.earned
    if (result.missing.length) {
      docsWithMissing.push({ doc, result })
      for (const field of result.missing) missingCounts[field.key] += 1
    }
  }
  const total = totalWeight * list.length
  docsWithMissing.sort((a, b) => a.result.score - b.result.score || b.result.missing.length - a.result.missing.length)
  return {
    score: list.length ? Math.round((earned / total) * 100) : null, // 分母为零时返回 null，由界面显示空状态
    earned,
    total,
    docsCount: list.length,
    filledFields: perDoc.size ? [...perDoc.values()].reduce((sum, r) => sum + r.filled, 0) : 0,
    totalFields: completenessFields.length * list.length,
    completeDocs: list.length - docsWithMissing.length,
    perDoc,
    docsWithMissing,
    missingCounts,
    fields: completenessFields,
  }
}

// 详情页按分组取字段（含填写值与缺失标记）
export function documentFieldGroups(doc) {
  return completenessGroups.map((group) => ({
    group,
    fields: completenessFields
      .filter((field) => field.group === group)
      .map((field) => ({ ...field, tier: fieldTier(field.weight), filled: isFieldFilled(doc, field.key) })),
  }))
}

export function getField(key) {
  return fieldMap[key]
}
