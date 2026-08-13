import enAnimation from './locales/en/animation.json'
import enCommon from './locales/en/common.json'
import enEditor from './locales/en/editor.json'
import enExport from './locales/en/export.json'
import enLayers from './locales/en/layers.json'
import enProjects from './locales/en/projects.json'
import enTools from './locales/en/tools.json'
import viAnimation from './locales/vi/animation.json'
import viCommon from './locales/vi/common.json'
import viEditor from './locales/vi/editor.json'
import viExport from './locales/vi/export.json'
import viLayers from './locales/vi/layers.json'
import viProjects from './locales/vi/projects.json'
import viTools from './locales/vi/tools.json'

export const coreResources = {
  en: {
    animation: enAnimation,
    common: enCommon,
    editor: enEditor,
    export: enExport,
    layers: enLayers,
    projects: enProjects,
    tools: enTools,
  },
  vi: {
    animation: viAnimation,
    common: viCommon,
    editor: viEditor,
    export: viExport,
    layers: viLayers,
    projects: viProjects,
    tools: viTools,
  },
} as const
