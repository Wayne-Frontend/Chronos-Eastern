/**
 * 补充声明：仓库自带的 wx typings 为 2021 年版本，缺少基础库 2.20.1 起提供的接口。
 * 原因：navigation-bar 组件改用 wx.getDeviceInfo / wx.getWindowInfo，替代已废弃的 wx.getSystemInfo。
 * 边界：只声明项目实际用到的字段；整份 typings 升级后本文件应整体删除。
 */
declare namespace WechatMiniprogram {
  interface DeviceInfo {
    platform: 'android' | 'ios' | 'devtools' | 'windows' | 'mac' | 'ohos'
  }

  interface WindowInfo {
    windowWidth: number
    safeArea: {
      top: number
    }
  }

  interface Wx {
    getDeviceInfo(): DeviceInfo
    getWindowInfo(): WindowInfo
  }
}
