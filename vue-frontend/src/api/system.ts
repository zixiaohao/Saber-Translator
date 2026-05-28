/**
 * 系统级 API
 * 包含 PDF/MOBI 解析、批量下载、调试文件清理等系统功能
 */

import { apiClient } from './client'
import type {
  ApiResponse,
  PdfParseStartResponse,
  PdfParseBatchResponse,
  DownloadSessionResponse,
  DownloadFinalizeResponse,
  ServerInfoResponse,
} from '@/types'

// ==================== PDF 解析 API ====================

/**
 * 开始 PDF 分批解析
 * @param file PDF 文件
 * @param batchSize 每批页数
 */
export async function parsePdfStart(
  file: File,
  batchSize: number = 5
): Promise<PdfParseStartResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('batch_size', batchSize.toString())
  return apiClient.upload<PdfParseStartResponse>('/api/parse_pdf_start', formData)
}

/**
 * 获取 PDF 解析批次
 * @param sessionId 解析会话 ID
 * @param startIndex 起始索引（复刻原版）
 * @param count 批次数量（复刻原版）
 */
export async function parsePdfBatch(
  sessionId: string,
  startIndex: number,
  count: number
): Promise<PdfParseBatchResponse> {
  return apiClient.post<PdfParseBatchResponse>('/api/parse_pdf_batch', {
    session_id: sessionId,
    start_index: startIndex,
    count: count,
  })
}

/**
 * 清理 PDF 解析会话
 * @param sessionId 解析会话 ID
 */
export async function parsePdfCleanup(sessionId: string): Promise<ApiResponse> {
  return apiClient.post<ApiResponse>(`/api/parse_pdf_cleanup/${sessionId}`)
}

// ==================== MOBI/AZW 解析 API ====================

/**
 * MOBI 解析开始响应
 */
export interface MobiParseStartResponse {
  success: boolean
  session_id?: string
  total_pages?: number   // 后端实际返回的字段
  total_images?: number  // 兼容旧版本
  error?: string
}

/**
 * MOBI 批次图片数据
 */
export interface MobiBatchImage {
  success: boolean
  data_url?: string
  width?: number
  height?: number
  filename?: string
  page_index?: number
  error?: string
}

/**
 * MOBI 解析批次响应
 */
export interface MobiParseBatchResponse {
  success: boolean
  images?: MobiBatchImage[]
  start_index?: number
  end_index?: number
  total_pages?: number
  has_more?: boolean
  error?: string
}

/**
 * 开始 MOBI/AZW 分批解析
 * @param file MOBI/AZW 文件
 * @param batchSize 每批图片数
 */
export async function parseMobiStart(
  file: File,
  batchSize: number = 5
): Promise<MobiParseStartResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('batch_size', batchSize.toString())
  return apiClient.upload<MobiParseStartResponse>('/api/parse_mobi_start', formData)
}

/**
 * 获取 MOBI/AZW 解析批次
 * @param sessionId 解析会话 ID
 * @param startIndex 起始索引
 * @param count 批次数量
 */
export async function parseMobiBatch(
  sessionId: string,
  startIndex: number = 0,
  count: number = 5
): Promise<MobiParseBatchResponse> {
  return apiClient.post<MobiParseBatchResponse>('/api/parse_mobi_batch', {
    session_id: sessionId,
    start_index: startIndex,
    count: count,
  })
}

/**
 * 清理 MOBI/AZW 解析会话
 * @param sessionId 解析会话 ID
 */
export async function parseMobiCleanup(sessionId: string): Promise<ApiResponse> {
  return apiClient.post<ApiResponse>(`/api/parse_mobi_cleanup/${sessionId}`)
}

// ==================== 批量下载 API ====================

/**
 * 开始下载会话
 * @param totalImages 总图片数量
 */
export async function downloadStartSession(
  totalImages: number
): Promise<DownloadSessionResponse> {
  return apiClient.post<DownloadSessionResponse>('/api/download_start_session', { total_images: totalImages })
}

/**
 * 上传图片到下载会话
 * @param sessionId 下载会话 ID
 * @param imageData Base64 图片数据
 * @param imageIndex 图片索引
 * @param filePath 文件相对路径（可选，用于保留文件夹结构，如 "漫画/第1章/01.jpg"）
 * @param outputFormat 输出图片格式（可选: png/jpeg/webp）
 * @param quality 输出质量（可选）
 */
export async function downloadUploadImage(
  sessionId: string,
  imageData: string,
  imageIndex: number,
  filePath?: string,
  outputFormat?: string,
  quality?: number
): Promise<ApiResponse> {
  const body: Record<string, unknown> = {
    session_id: sessionId,
    image_data: imageData,
    image_index: imageIndex,
    file_path: filePath,
  }
  if (outputFormat) {
    body.output_format = outputFormat
  }
  if (quality !== undefined && quality !== null) {
    body.quality = quality
  }
  return apiClient.post<ApiResponse>('/api/download_upload_image', body)
}

/**
 * 完成下载打包
 * @param sessionId 下载会话 ID
 * @param format 下载格式
 */
export async function downloadFinalize(
  sessionId: string,
  format: 'zip' | 'pdf' | 'cbz'
): Promise<DownloadFinalizeResponse> {
  return apiClient.post<DownloadFinalizeResponse>('/api/download_finalize', {
    session_id: sessionId,
    format,
  })
}

/**
 * 获取下载文件 URL
 * @param fileId 文件 ID
 * @param format 下载格式
 */
export function getDownloadFileUrl(fileId: string, format: 'zip' | 'pdf' | 'cbz'): string {
  return `/api/download_file/${fileId}?format=${format}`
}

// ==================== 系统维护 API ====================

/**
 * 清理调试文件
 */
export async function cleanDebugFiles(): Promise<ApiResponse> {
  return apiClient.post<ApiResponse>('/api/clean_debug_files')
}

/**
 * 清理临时文件
 */
export async function cleanTempFiles(): Promise<ApiResponse> {
  return apiClient.post<ApiResponse>('/api/clean_temp_files')
}

/**
 * 获取服务器信息（局域网地址等）
 */
export async function getServerInfo(): Promise<ServerInfoResponse> {
  return apiClient.get<ServerInfoResponse>('/api/server-info')
}

// ==================== GPU 资源管理 API ====================

/**
 * GPU 清理响应
 */
export interface GpuCleanupResponse {
  success: boolean
  message?: string
  unloaded_models?: string[]
  cuda_available?: boolean
  memory_allocated_mb?: number
  memory_reserved_mb?: number
  error?: string
}

/**
 * GPU 状态响应
 */
export interface GpuStatusResponse {
  success: boolean
  cuda_available?: boolean
  device_name?: string
  memory_allocated_mb?: number
  memory_reserved_mb?: number
  memory_total_mb?: number
  models_loaded?: string[]
  error?: string
}

/**
 * 清理 GPU 显存并卸载已加载的模型
 * 建议在进入翻译页面时调用，确保 GPU 状态干净
 */
export async function cleanupGpu(): Promise<GpuCleanupResponse> {
  return apiClient.post<GpuCleanupResponse>('/api/cleanup-gpu')
}

/**
 * 获取 GPU 状态信息
 */
export async function getGpuStatus(): Promise<GpuStatusResponse> {
  return apiClient.get<GpuStatusResponse>('/api/gpu-status')
}

// ==================== 归档管理 API ====================

/**
 * 归档文件项
 */
export interface ArchiveItem {
  id: string
  name: string
  size: number
  size_display: string
  page_count: number
  format: string
  created_at: string
  created_at_display: string
}

/**
 * 归档列表响应
 */
export interface ArchivesListResponse {
  success: boolean
  archives: ArchiveItem[]
  error?: string
}

/**
 * 归档保存响应
 */
export interface ArchiveSaveResponse {
  success: boolean
  message?: string
  archive?: ArchiveItem
  error?: string
}

/**
 * 获取历史归档列表
 */
export async function getArchivesList(): Promise<ArchivesListResponse> {
  return apiClient.get<ArchivesListResponse>('/api/archives/list')
}

/**
 * 获取归档文件下载 URL
 * @param archiveId 归档ID
 */
export function getArchiveDownloadUrl(archiveId: string): string {
  return `/api/archives/download/${archiveId}`
}

/**
 * 删除归档文件
 * @param archiveId 归档ID
 */
export async function deleteArchive(archiveId: string): Promise<ApiResponse> {
  return apiClient.post<ApiResponse>('/api/archives/delete', { archive_id: archiveId })
}

/**
 * 保存翻译结果为服务端归档
 * @param images Base64图片数据数组
 * @param name 可选：自定义名称
 */
export async function saveArchive(
  images: string[],
  name?: string
): Promise<ArchiveSaveResponse> {
  return apiClient.post<ArchiveSaveResponse>('/api/archives/save', {
    images,
    name: name || '',
  })
}

/**
 * 从下载会话保存归档（复用已格式转换的包）
 * @param sessionId 下载会话ID
 * @param format 打包格式
 * @param name 可选：自定义名称
 */
export async function saveArchiveFromSession(
  sessionId: string,
  format: 'zip' | 'pdf' | 'cbz' = 'zip',
  name?: string
): Promise<ArchiveSaveResponse> {
  return apiClient.post<ArchiveSaveResponse>('/api/archives/save-from-session', {
    session_id: sessionId,
    format,
    name: name || '',
  })
}

// ==================== 下载格式信息 API ====================

/**
 * 格式信息
 */
export interface FormatInfo {
  ext: string
  mime: string
  label: string
  quality_range: [number, number]
  quality_default: number
}

/**
 * 下载格式信息响应
 */
export interface DownloadFormatInfoResponse {
  success: boolean
  formats: Record<string, FormatInfo>
  defaults: {
    format: string
    quality: number
    png_compress: number
    jpeg_quality: number
    webp_quality: number
  }
}

/**
 * 获取支持的输出格式信息
 */
export async function getDownloadFormatInfo(): Promise<DownloadFormatInfoResponse> {
  return apiClient.get<DownloadFormatInfoResponse>('/api/download_format_info')
}
