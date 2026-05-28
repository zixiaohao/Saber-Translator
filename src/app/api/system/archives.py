"""
历史打包文件管理API

提供:
- 列表查询已保存的 ZIP 打包文件
- 下载历史 ZIP 文件
- 删除历史 ZIP 文件
- 服务端自动打包并保存 ZIP
"""

import os
import time
import zipfile
import logging
import json
from typing import List, Dict, Any
from datetime import datetime
from flask import request, jsonify, send_file

from . import system_bp
from src.shared.path_helpers import get_app_root

logger = logging.getLogger("SystemAPI.Archives")

ARCHIVE_STORE_DIR_NAME = 'archives'
ARCHIVE_INDEX_FILE = 'archive_index.json'


def _get_archives_dir():
    base_path = get_app_root()
    archives_dir = os.path.join(base_path, 'data', ARCHIVE_STORE_DIR_NAME)
    os.makedirs(archives_dir, exist_ok=True)
    return archives_dir


def _get_index_path():
    return os.path.join(_get_archives_dir(), ARCHIVE_INDEX_FILE)


def _load_index() -> List[Dict[str, Any]]:
    index_path = _get_index_path()
    if os.path.exists(index_path):
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            logger.warning("归档索引损坏，重建空索引")
    return []


def _save_index(index_data: List[Dict[str, Any]]):
    index_path = _get_index_path()
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)


def _cleanup_orphan_archives():
    """清理索引中不存在但磁盘上存在的孤立归档文件"""
    archives_dir = _get_archives_dir()
    index = _load_index()
    indexed_ids = {entry.get('id') for entry in index}

    for fname in os.listdir(archives_dir):
        if fname == ARCHIVE_INDEX_FILE:
            continue
        fpath = os.path.join(archives_dir, fname)
        if not os.path.isfile(fpath):
            continue
        archive_id = os.path.splitext(fname)[0]
        if archive_id not in indexed_ids:
            try:
                os.remove(fpath)
                logger.info(f"已清理孤立归档文件: {fname}")
            except OSError:
                pass


@system_bp.route('/archives/list', methods=['GET'])
def archives_list_api():
    """
    列出所有历史打包文件

    返回:
        {
            'success': True,
            'archives': [
                {
                    'id': 'uuid',
                    'name': 'translations_20240528_120000.zip',
                    'size': 123456,
                    'size_display': '120.6 KB',
                    'page_count': 15,
                    'format': 'zip',
                    'created_at': '2024-05-28T12:00:00',
                    'created_at_display': '2024-05-28 12:00:00'
                }
            ]
        }
    """
    try:
        _cleanup_orphan_archives()
        index = _load_index()

        archives_dict = {entry['id']: entry for entry in index}

        archives_dir = _get_archives_dir()
        valid_entries = []

        for entry in index:
            archive_id = entry.get('id')
            if not archive_id:
                continue
            archive_path = os.path.join(archives_dir, f"{archive_id}.zip")
            if os.path.exists(archive_path):
                size = os.path.getsize(archive_path)
                entry['size'] = size
                entry['size_display'] = _format_size(size)
                valid_entries.append(entry)
            else:
                logger.info(f"归档文件已不存在，从索引中移除: {archive_id}")

        if len(valid_entries) != len(index):
            _save_index(valid_entries)

        valid_entries.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return jsonify({
            'success': True,
            'archives': valid_entries
        })

    except Exception as e:
        logger.error(f"获取归档列表失败: {str(e)}", exc_info=True)
        return jsonify({'error': f'获取归档列表失败: {str(e)}'}), 500


@system_bp.route('/archives/download/<archive_id>', methods=['GET'])
def archives_download_api(archive_id: str):
    """
    下载指定的历史打包文件

    URL参数:
        archive_id: 归档文件ID
    """
    try:
        if not archive_id or '..' in archive_id or '/' in archive_id or '\\' in archive_id:
            return jsonify({'error': '无效的归档ID'}), 400

        archives_dir = _get_archives_dir()
        archive_path = os.path.join(archives_dir, f"{archive_id}.zip")

        if not os.path.exists(archive_path):
            return jsonify({'error': '归档文件不存在或已过期'}), 404

        index = _load_index()
        entry = next((e for e in index if e.get('id') == archive_id), None)
        download_name = entry.get('name', f'translations_{archive_id[:8]}.zip') if entry else f'translations_{archive_id[:8]}.zip'

        logger.info(f"发送归档文件: {download_name}")

        return send_file(
            archive_path,
            mimetype='application/zip',
            as_attachment=True,
            download_name=download_name
        )

    except Exception as e:
        logger.error(f"下载归档文件失败: {str(e)}", exc_info=True)
        return jsonify({'error': f'下载归档文件失败: {str(e)}'}), 500


@system_bp.route('/archives/delete', methods=['POST'])
def archives_delete_api():
    """
    删除指定的历史打包文件

    请求体:
        {
            'archive_id': 'uuid'
        }
    """
    try:
        data = request.json or {}
        archive_id = data.get('archive_id')

        if not archive_id:
            return jsonify({'error': '缺少归档ID'}), 400

        if '..' in archive_id or '/' in archive_id or '\\' in archive_id:
            return jsonify({'error': '无效的归档ID'}), 400

        archives_dir = _get_archives_dir()
        archive_path = os.path.join(archives_dir, f"{archive_id}.zip")

        if os.path.exists(archive_path):
            os.remove(archive_path)
            logger.info(f"已删除归档文件: {archive_id}")

        index = _load_index()
        index = [e for e in index if e.get('id') != archive_id]
        _save_index(index)

        return jsonify({'success': True, 'message': '归档文件已删除'})

    except Exception as e:
        logger.error(f"删除归档文件失败: {str(e)}", exc_info=True)
        return jsonify({'error': f'删除归档文件失败: {str(e)}'}), 500


@system_bp.route('/archives/save', methods=['POST'])
def archives_save_api():
    """
    保存翻译结果到服务端归档

    请求体:
        {
            'images': ['base64_data_1', 'base64_data_2', ...],  # 图片base64数据
            'name': 'my-translations'  # 可选：自定义名称
        }

    返回:
        {
            'success': True,
            'archive': { 'id': 'uuid', 'name': '...', ... }
        }
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': '请求数据为空'}), 400

        images = data.get('images', [])
        custom_name = data.get('name', '').strip()

        if not images:
            return jsonify({'error': '没有提供图片数据'}), 400

        import uuid
        import base64
        import io
        from PIL import Image

        archive_id = str(uuid.uuid4())
        archives_dir = _get_archives_dir()

        now = datetime.now()
        timestamp = now.strftime('%Y%m%d_%H%M%S')

        if custom_name:
            safe_name = "".join(c if c.isalnum() or c in '._-' else '_' for c in custom_name)
            archive_name = f"{safe_name}_{timestamp}.zip"
        else:
            archive_name = f"translations_{timestamp}.zip"

        archive_path = os.path.join(archives_dir, f"{archive_id}.zip")
        page_count = 0

        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for i, img_data in enumerate(images):
                if not img_data:
                    continue

                try:
                    if ',' in img_data:
                        img_data = img_data.split(',', 1)[1]

                    img_bytes = base64.b64decode(img_data)
                    img = Image.open(io.BytesIO(img_bytes))
                    if img.mode != 'RGB':
                        img = img.convert('RGB')

                    img_buffer = io.BytesIO()
                    img.save(img_buffer, format='PNG')
                    img_buffer.seek(0)

                    zipf.writestr(f"page_{i + 1:03d}.png", img_buffer.read())
                    page_count += 1

                except Exception as e:
                    logger.error(f"保存图片 {i} 到归档失败: {str(e)}")

        if page_count == 0:
            os.remove(archive_path)
            return jsonify({'error': '所有图片处理失败'}), 500

        archive_size = os.path.getsize(archive_path)

        index_entry = {
            'id': archive_id,
            'name': archive_name,
            'page_count': page_count,
            'format': 'zip',
            'created_at': now.isoformat(),
            'created_at_display': now.strftime('%Y-%m-%d %H:%M:%S'),
        }

        index = _load_index()
        index.append(index_entry)
        _save_index(index)

        index_entry['size'] = archive_size
        index_entry['size_display'] = _format_size(archive_size)

        logger.info(f"归档保存成功: {archive_name} ({page_count}页, {_format_size(archive_size)})")

        return jsonify({
            'success': True,
            'message': f'归档保存成功: {page_count} 张图片',
            'archive': index_entry
        })

    except Exception as e:
        logger.error(f"保存归档失败: {str(e)}", exc_info=True)
        return jsonify({'error': f'保存归档失败: {str(e)}'}), 500


@system_bp.route('/archives/save-from-session', methods=['POST'])
def archives_save_from_session_api():
    """
    从下载会话中保存已打包的ZIP到归档目录（复用已转换格式的包）

    请求体:
        {
            'session_id': 'uuid',     # 下载会话ID
            'format': 'zip'|'pdf'|'cbz',  # 打包格式
            'name': 'custom-name'     # 可选：自定义名称
        }

    返回:
        {
            'success': True,
            'archive': { 'id': 'uuid', 'name': '...', ... }
        }
    """
    try:
        data = request.json or {}
        session_id = data.get('session_id')
        format_type = data.get('format', 'zip')
        custom_name = data.get('name', '').strip()

        if not session_id:
            return jsonify({'error': '缺少会话ID'}), 400

        if '..' in session_id or '/' in session_id or '\\' in session_id:
            return jsonify({'error': '无效的会话ID'}), 400

        base_path = get_app_root()
        temp_dir = os.path.join(base_path, 'data', 'temp', session_id)

        if not os.path.exists(temp_dir):
            return jsonify({'error': '会话不存在或已过期'}), 404

        if format_type == 'cbz':
            src_name = 'comic_translator_images.cbz'
        elif format_type == 'pdf':
            src_name = 'comic_translator_images.pdf'
        else:
            src_name = 'comic_translator_images.zip'

        src_path = os.path.join(temp_dir, src_name)
        if not os.path.exists(src_path):
            return jsonify({'error': '打包文件不存在，请先完成下载'}), 404

        import uuid
        archive_id = str(uuid.uuid4())
        archives_dir = _get_archives_dir()

        now = datetime.now()
        timestamp = now.strftime('%Y%m%d_%H%M%S')

        if custom_name:
            safe_name = "".join(c if c.isalnum() or c in '._-' else '_' for c in custom_name)
            archive_name = f"{safe_name}_{timestamp}.zip"
        else:
            archive_name = f"translations_{timestamp}.zip"

        archive_path = os.path.join(archives_dir, f"{archive_id}.zip")

        import shutil
        shutil.copy2(src_path, archive_path)

        archive_size = os.path.getsize(archive_path)

        index_entry = {
            'id': archive_id,
            'name': archive_name,
            'page_count': 0,
            'format': 'zip',
            'created_at': now.isoformat(),
            'created_at_display': now.strftime('%Y-%m-%d %H:%M:%S'),
        }

        index = _load_index()
        index.append(index_entry)
        _save_index(index)

        index_entry['size'] = archive_size
        index_entry['size_display'] = _format_size(archive_size)

        logger.info(f"从会话归档成功: {archive_name} ({_format_size(archive_size)})")

        return jsonify({
            'success': True,
            'message': f'归档保存成功',
            'archive': index_entry
        })

    except Exception as e:
        logger.error(f"从会话保存归档失败: {str(e)}", exc_info=True)
        return jsonify({'error': f'保存归档失败: {str(e)}'}), 500


def _format_size(size_bytes: int) -> str:
    """格式化文件大小为可读字符串"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"
