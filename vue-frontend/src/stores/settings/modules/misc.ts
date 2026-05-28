/**
 * 更多设置模块
 * 对应设置模态窗的 "更多" Tab
 * 包含 PDF 处理、调试设置、文字样式、导出下载等杂项设置
 */

import { computed, type Ref } from 'vue'
import type {
  TranslationSettings,
  TranslationSettingsUpdates,
  TextStyleSettings,
  PdfProcessingMethod,
  ImageOutputFormat,
  ExportSettings
} from '@/types/settings'

/**
 * 创建更多设置模块
 */
export function useMiscSettings(
  settings: Ref<TranslationSettings>,
  saveToStorage: () => void
) {
  const textStyle = computed(() => settings.value.textStyle)

  function updateSettings(updates: TranslationSettingsUpdates): void {
    Object.assign(settings.value, updates)
    saveToStorage()
  }

  function updateTextStyle(updates: Partial<TextStyleSettings>): void {
    Object.assign(settings.value.textStyle, updates)
  }

  function setPdfProcessingMethod(method: PdfProcessingMethod): void {
    settings.value.pdfProcessingMethod = method
    saveToStorage()
  }

  function setShowDetectionDebug(show: boolean): void {
    settings.value.showDetectionDebug = show
    saveToStorage()
  }

  function setAutoSaveInBookshelfMode(enabled: boolean): void {
    settings.value.autoSaveInBookshelfMode = enabled
    saveToStorage()
  }

  function setRemoveTextWithOcr(enabled: boolean): void {
    settings.value.removeTextWithOcr = enabled
    saveToStorage()
  }

  function setEnableVerboseLogs(enabled: boolean): void {
    settings.value.enableVerboseLogs = enabled
    saveToStorage()
  }

  function setLamaDisableResize(disabled: boolean): void {
    settings.value.lamaDisableResize = disabled
    saveToStorage()
  }

  function setImageOutputFormat(format: ImageOutputFormat): void {
    settings.value.exportSettings.imageFormat = format
    saveToStorage()
  }

  function setJpegQuality(quality: number): void {
    settings.value.exportSettings.jpegQuality = Math.max(1, Math.min(100, Math.round(quality)))
    saveToStorage()
  }

  function setWebpQuality(quality: number): void {
    settings.value.exportSettings.webpQuality = Math.max(1, Math.min(100, Math.round(quality)))
    saveToStorage()
  }

  function setPngCompressLevel(level: number): void {
    settings.value.exportSettings.pngCompressLevel = Math.max(0, Math.min(9, Math.round(level)))
    saveToStorage()
  }

  function setAutoArchiveZip(enabled: boolean): void {
    settings.value.exportSettings.autoArchiveZip = enabled
    saveToStorage()
  }

  function updateExportSettings(updates: Partial<ExportSettings>): void {
    Object.assign(settings.value.exportSettings, updates)
    saveToStorage()
  }

  return {
    textStyle,
    updateSettings,
    updateTextStyle,
    setPdfProcessingMethod,
    setShowDetectionDebug,
    setAutoSaveInBookshelfMode,
    setRemoveTextWithOcr,
    setEnableVerboseLogs,
    setLamaDisableResize,
    setImageOutputFormat,
    setJpegQuality,
    setWebpQuality,
    setPngCompressLevel,
    setAutoArchiveZip,
    updateExportSettings
  }
}
