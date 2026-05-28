<template>
  <div class="archive-panel-section" v-if="isOpen">
    <div class="archive-panel-header">
      <h3>历史归档文件</h3>
      <button class="close-btn" @click="$emit('close')" title="关闭">✕</button>
    </div>

    <div class="archive-panel-actions">
      <button class="btn btn-secondary" @click="refreshArchives" :disabled="isLoading">
        {{ isLoading ? '加载中...' : '刷新列表' }}
      </button>
    </div>

    <div v-if="isLoading && archives.length === 0" class="archive-loading">
      加载中...
    </div>

    <div v-else-if="archives.length === 0" class="archive-empty">
      暂无历史归档文件。
      <br />
      <span class="hint">可在设置中开启"翻译完成后自动打包为ZIP"后，翻译完成后自动生成归档。</span>
    </div>

    <div v-else class="archive-list">
      <div
        v-for="archive in archives"
        :key="archive.id"
        class="archive-item"
      >
        <div class="archive-info">
          <div class="archive-name" :title="archive.name">{{ archive.name }}</div>
          <div class="archive-meta">
            <span>{{ archive.page_count }} 页</span>
            <span>{{ archive.size_display }}</span>
            <span>{{ archive.created_at_display || formatDate(archive.created_at) }}</span>
          </div>
        </div>
        <div class="archive-actions">
          <a
            :href="getDownloadUrl(archive.id)"
            class="archive-download-link"
            :download="archive.name"
          >
            <button class="btn btn-primary btn-sm">下载</button>
          </a>
          <button
            class="btn btn-danger btn-sm"
            @click="handleDelete(archive.id, archive.name)"
            :disabled="deletingId === archive.id"
          >
            {{ deletingId === archive.id ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="archive-error">{{ errorMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getArchivesList,
  deleteArchive,
  getArchiveDownloadUrl,
  type ArchiveItem
} from '@/api/system'
import { showToast } from '@/utils/toast'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const archives = ref<ArchiveItem[]>([])
const isLoading = ref(false)
const deletingId = ref<string | null>(null)
const errorMessage = ref('')

onMounted(() => {
  refreshArchives()
})

async function refreshArchives() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const result = await getArchivesList()
    if (result.success) {
      archives.value = result.archives || []
    } else {
      errorMessage.value = result.error || '获取列表失败'
    }
  } catch (e) {
    errorMessage.value = '获取列表失败'
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

function getDownloadUrl(archiveId: string): string {
  return getArchiveDownloadUrl(archiveId)
}

async function handleDelete(archiveId: string, archiveName: string) {
  if (!confirm(`确认删除归档 "${archiveName}"？`)) return

  deletingId.value = archiveId
  try {
    const result = await deleteArchive(archiveId)
    if (result.success) {
      archives.value = archives.value.filter(a => a.id !== archiveId)
      showToast('归档已删除', 'success')
    } else {
      showToast(result.error || '删除失败', 'error')
    }
  } catch (e) {
    showToast('删除失败', 'error')
    console.error(e)
  } finally {
    deletingId.value = null
  }
}

function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  try {
    const d = new Date(isoDate)
    return d.toLocaleString()
  } catch {
    return isoDate
  }
}
</script>

<style scoped>
.archive-panel-section {
  width: 100%;
  margin-top: 20px;
  padding: 15px 20px;
  background-color: var(--secondary-bg, #f9f9f9);
  border: 1px solid var(--border-color, #eee);
  border-radius: 8px;
}

.archive-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.archive-panel-header h3 {
  margin: 0;
  font-size: 1em;
  color: var(--text-primary, #333);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  color: var(--text-secondary, #666);
  padding: 4px 8px;
  border-radius: 4px;
}

.close-btn:hover {
  color: var(--text-primary, #333);
  background: rgba(0,0,0,0.05);
}

.archive-panel-actions {
  margin-bottom: 12px;
}

.archive-loading,
.archive-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary, #666);
}

.archive-empty .hint {
  font-size: 0.85em;
  color: var(--text-tertiary, #999);
}

.archive-list {
  max-height: 300px;
  overflow-y: auto;
}

.archive-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  margin-bottom: 8px;
  background: var(--bg-color, #fff);
}

.archive-info {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.archive-name {
  font-size: 0.9em;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archive-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8em;
  color: var(--text-secondary, #888);
  margin-top: 4px;
}

.archive-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8em;
}

.btn-primary {
  background: linear-gradient(135deg, #2980b9 0%, #3498db 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-danger {
  background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-secondary {
  padding: 8px 16px;
  background: var(--input-bg-color, #f0f0f0);
  color: var(--text-primary, #333);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--hover-bg-color, #e0e0e0);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.archive-download-link {
  text-decoration: none;
  display: inline-block;
}

.archive-error {
  color: var(--error-color, #e74c3c);
  text-align: center;
  padding: 10px;
  font-size: 0.9em;
}
</style>
