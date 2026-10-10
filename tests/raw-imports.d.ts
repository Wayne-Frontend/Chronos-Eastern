/**
 * Vite（vitest）的 `?raw` 后缀导入：把非 TS 资源当字符串读进来。
 * 只为测试里核对 wxml 的绑定名而声明；小程序运行时不走这条路径。
 */
declare module '*?raw' {
  const content: string
  export default content
}
