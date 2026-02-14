/**
 * 消息发送服务入口
 * 统一导出各种发送方式
 */

export { sendSingle } from './text';
export { sendForward } from './forward';
export { sendPuppeteer } from './image';
