import { log } from '@/utils/log'
import settingState from '@/store/setting/state'

export const searchLog = {
  isEnabled: false,

  init() {
    const settingValue = settingState.setting['common.isEnableSearchLog']
    this.isEnabled = settingValue !== undefined ? settingValue : false
    if (this.isEnabled) {
      log.info('[Search Log] 初始化搜索日志模块')
      log.info('[Search Log] 设置值: ' + JSON.stringify(settingValue))
      log.info('[Search Log] 状态: ' + (this.isEnabled ? '开启' : '关闭'))
    }
  },

  updateEnabled(enabled: boolean) {
    this.isEnabled = enabled
    if (this.isEnabled) {
      log.info('[Search Log] 更新搜索日志状态: ' + (enabled ? '开启' : '关闭'))
    }
  },

  info(...msgs: any[]) {
    if (!this.isEnabled) return
    const msg = msgs
      .map((m) =>
        typeof m == 'string' ? m : m instanceof Error ? (m.stack ?? m.message) : JSON.stringify(m)
      )
      .join(' ')
    log.info('[Search] ' + msg)
  },

  warn(...msgs: any[]) {
    if (!this.isEnabled) return
    const msg = msgs
      .map((m) =>
        typeof m == 'string' ? m : m instanceof Error ? (m.stack ?? m.message) : JSON.stringify(m)
      )
      .join(' ')
    log.warn('[Search] ' + msg)
  },

  error(...msgs: any[]) {
    if (!this.isEnabled) return
    const msg = msgs
      .map((m) =>
        typeof m == 'string' ? m : m instanceof Error ? (m.stack ?? m.message) : JSON.stringify(m)
      )
      .join(' ')
    log.error('[Search] ' + msg)
  },
}

export default searchLog
