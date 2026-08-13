import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import console from 'node:console'

const root = resolve(process.cwd(), 'src/i18n/locales')
const referenceLocale = 'en'
const locales = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
const namespaces = (await readdir(resolve(root, referenceLocale)))
  .filter((file) => file.endsWith('.json'))
  .sort()

function collectShape(value, path = '$', result = []) {
  if (Array.isArray(value)) {
    result.push(`${path}:array(${value.length})`)
    value.forEach((item, index) => collectShape(item, `${path}[${index}]`, result))
  } else if (value !== null && typeof value === 'object') {
    result.push(`${path}:object`)
    for (const key of Object.keys(value).sort()) collectShape(value[key], `${path}.${key}`, result)
  } else {
    result.push(`${path}:${typeof value}`)
  }
  return result
}

function collectInterpolations(value, path = '$', result = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectInterpolations(item, `${path}[${index}]`, result))
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value))
      collectInterpolations(value[key], `${path}.${key}`, result)
  } else if (typeof value === 'string') {
    const variables = [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)]
      .map((match) => match[1])
      .filter(Boolean)
      .sort()
    result.set(path, variables.join(','))
  }
  return result
}

const errors = []
for (const locale of locales) {
  const files = (await readdir(resolve(root, locale)))
    .filter((file) => file.endsWith('.json'))
    .sort()
  for (const missing of namespaces.filter((file) => !files.includes(file))) {
    errors.push(`${locale}: missing namespace ${missing}`)
  }
  for (const extra of files.filter((file) => !namespaces.includes(file))) {
    errors.push(`${locale}: extra namespace ${extra}`)
  }
  for (const namespace of namespaces.filter((file) => files.includes(file))) {
    const [reference, candidate] = await Promise.all([
      readFile(resolve(root, referenceLocale, namespace), 'utf8').then(JSON.parse),
      readFile(resolve(root, locale, namespace), 'utf8').then(JSON.parse),
    ])
    const expected = collectShape(reference)
    const actual = collectShape(candidate)
    if (expected.join('\n') !== actual.join('\n')) {
      const expectedSet = new Set(expected)
      const actualSet = new Set(actual)
      for (const item of expected.filter((entry) => !actualSet.has(entry))) {
        errors.push(`${locale}/${namespace}: missing or mismatched ${item}`)
      }
      for (const item of actual.filter((entry) => !expectedSet.has(entry))) {
        errors.push(`${locale}/${namespace}: extra or mismatched ${item}`)
      }
    }
    const expectedVariables = collectInterpolations(reference)
    const actualVariables = collectInterpolations(candidate)
    for (const [path, variables] of expectedVariables) {
      if (actualVariables.get(path) !== variables) {
        errors.push(
          `${locale}/${namespace}: interpolation mismatch at ${path} (expected "${variables}", received "${actualVariables.get(path) ?? ''}")`,
        )
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`i18n resources match: ${locales.length} locales × ${namespaces.length} namespaces`)
}
