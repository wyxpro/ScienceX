/* ============================================================
   学术文献导入与管理弹窗（自 pages/Reader.tsx 拆分，F1）
   现代化学术科研拟态设计，支持 PDF/Word/Markdown/CAJ 多格式解析
   表单与校验状态内聚于本组件；导入提交由父级 onImport 处理并回传错误信息
   ============================================================ */
import { useState } from 'react';
import Icon from '../../components/Icon';
import { IMPORT_ACCEPT, MAX_UPLOAD_BYTES, importKindInfo } from './readerShared';

export interface ReaderImportPayload {
  file: File | null;
  name: string;
}

interface ReaderImportModalProps {
  isMobile: boolean;
  docs: any[] | null;
  docId: string | null;
  onClose: () => void;
  onSelectDoc: (id: string) => void;
  onRemoveDoc: (d: any, e: React.MouseEvent) => void;
  /** 执行导入：成功返回 null（父级负责关闭弹窗），失败返回错误提示文案 */
  onImport: (payload: ReaderImportPayload) => Promise<string | null>;
}

export default function ReaderImportModal({ isMobile, docs, docId, onClose, onSelectDoc, onRemoveDoc, onImport }: ReaderImportModalProps) {
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadErr, setUploadErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* 选择 / 拖入文件：统一做格式与 50MB 体积校验 */
  const acceptFile = (f: File | null | undefined) => {
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'docx', 'doc', 'md', 'markdown', 'caj'].includes(ext)) {
      setUploadErr(`暂不支持 .${ext || '未知'} 格式，请上传 PDF / Word(.docx) / Markdown / CAJ 文件`);
      setUploadFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setUploadErr(`文件大小 ${(f.size / 1024 / 1024).toFixed(1)}MB 超过 50MB 单文件上限`);
      setUploadFile(null);
      return;
    }
    setUploadErr('');
    setUploadFile(f);
    setUploadName(f.name);
  };

  const submit = async () => {
    const name = uploadFile?.name || uploadName.trim();
    if (!name) {
      setUploadErr('请选择文件，或输入文件名 / URL');
      return;
    }
    if (uploading) return;
    setUploading(true);
    const err = await onImport({ file: uploadFile, name });
    setUploading(false);
    if (err) setUploadErr(err);
  };

  return (
    <div
      className="modal-scrim"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal anim-in"
        style={{
          maxWidth: 620,
          width: isMobile ? 'calc(100% - 16px)' : '92%',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* 弹窗头部 */}
        <div
          className="row-between items-center"
          style={{
            padding: isMobile ? '14px 14px' : '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            gap: isMobile ? 8 : undefined,
          }}
        >
          <div className="row g-2 items-center">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(27, 122, 94, 0.1)',
                color: '#1b7a5e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="upload" size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                学术文献导入与知识解析
              </h3>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                支持 PDF · Word (DOCX) · Markdown · CAJ（知网）四种格式的结构化解析
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: 8, width: 32, height: 32 }}
            onClick={onClose}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="modal-body" style={{ maxHeight: isMobile ? '62vh' : '72vh', overflowY: 'auto', padding: isMobile ? '16px 14px' : '20px 24px' }}>
          {/* 文件上传拖拽区 */}
          <div
            style={{
              border: uploadFile ? '2px solid #1b7a5e' : dragOver ? '2px dashed #1b7a5e' : '2px dashed #cbd5e1',
              borderRadius: 14,
              padding: uploadFile ? '18px' : '28px 20px',
              background: uploadFile ? '#f0fdf4' : dragOver ? '#ecfdf5' : '#f8fafc',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
            onClick={() => document.getElementById('academic-file-input')?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              acceptFile(e.dataTransfer?.files?.[0]);
            }}
          >
            <input
              id="academic-file-input"
              type="file"
              accept={IMPORT_ACCEPT}
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                acceptFile(f);
                e.target.value = '';
              }}
            />

            {!uploadFile ? (
              <>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#1b7a5e',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  <Icon name="upload" size={22} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                  点击选择本地文献，或将文献文件拖拽至此
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  单文件最大支持 50MB，自动提取标题、作者、摘要、章节段落与图表引用
                </div>

                {/* 格式标签展示 */}
                <div className="row g-2 justify-center wrap" style={{ marginTop: 14 }}>
                  <span className="tag" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: 11 }}>
                    PDF 论文
                  </span>
                  <span className="tag" style={{ background: '#dbeafe', color: '#2563eb', fontWeight: 600, fontSize: 11 }}>
                    Word (.docx)
                  </span>
                  <span className="tag" style={{ background: '#ede9fe', color: '#7c3aed', fontWeight: 600, fontSize: 11 }}>
                    Markdown
                  </span>
                  <span className="tag" style={{ background: '#ffedd5', color: '#ea580c', fontWeight: 600, fontSize: 11 }}>
                    CAJ 知网
                  </span>
                </div>
              </>
            ) : (
              <div className="row-between items-center" style={{ textAlign: 'left' }}>
                <div className="row g-3 items-center" style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: '#1b7a5e',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="file" size={20} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {uploadFile.name}
                    </div>
                    <div className="row g-1 items-center" style={{ fontSize: 12, color: '#166534', marginTop: 3 }}>
                      <span
                        className="tag"
                        style={{
                          background: importKindInfo(uploadFile.name).bg,
                          color: importKindInfo(uploadFile.name).color,
                          fontWeight: 600,
                          fontSize: 10.5,
                        }}
                      >
                        {importKindInfo(uploadFile.name).label}
                      </span>
                      <span>
                        {(uploadFile.size / 1024).toFixed(0)} KB · 格式与体积校验通过 · 点击可更换
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadFile(null);
                    setUploadName('');
                    setUploadErr('');
                  }}
                >
                  移除
                </button>
              </div>
            )}
          </div>

          {/* 校验错误提示 */}
          {uploadErr && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="alert" size={13} /> {uploadErr}
            </div>
          )}

          {/* URL 导入输入 */}
          <div style={{ marginTop: 18 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
              或输入公网文献链接 / ArXiv 地址：
            </label>
            <div className="row g-2 items-center">
              <input
                className="input grow"
                style={{ fontSize: 13, background: '#f8fafc', border: '1px solid #cbd5e1' }}
                value={uploadName}
                onChange={(e) => {
                  setUploadName(e.target.value);
                  if (uploadFile) setUploadFile(null);
                }}
                placeholder="https://arxiv.org/pdf/2303.xxxxx.pdf 或文献文件名…"
              />
              {uploadName && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setUploadName('');
                    setUploadFile(null);
                  }}
                >
                  清空
                </button>
              )}
            </div>
          </div>

          {/* 已有文献库快速切换 */}
          {docs && docs.length > 0 && (
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #e2e8f0' }}>
              <div className="row-between items-center mb-2">
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                  课题文献库（点击直接切换研读）：
                </span>
                <span style={{ fontSize: 11.5, color: '#94a3b8' }}>共 {docs.length} 篇文献</span>
              </div>
              <div
                className="col g-2"
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  padding: 4,
                }}
              >
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="row-between items-center"
                    style={{
                      padding: '9px 12px',
                      borderRadius: 10,
                      background: docId === d.id ? '#ecfdf5' : '#f8fafc',
                      border: docId === d.id ? '1px solid #10b981' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => onSelectDoc(d.id)}
                  >
                    <div className="row g-2 items-center" style={{ minWidth: 0, flex: 1 }}>
                      <Icon name="file" size={14} style={{ color: docId === d.id ? '#059669' : '#64748b' }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: docId === d.id ? 700 : 500,
                            color: docId === d.id ? '#065f46' : '#1e293b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                          {d.venue || 'IEEE / ACM 顶刊'} · {d.year || 2026}
                        </div>
                      </div>
                    </div>
                    {docId === d.id ? (
                      <span className="tag tag-green" style={{ fontSize: 10.5, padding: '2px 8px' }}>
                        正在研读
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#64748b' }}>切换 ➔</span>
                    )}
                    <button
                      className="btn btn-ghost btn-icon"
                      title={`删除《${d.title}》`}
                      style={{
                        padding: 4,
                        borderColor: 'transparent',
                        background: 'transparent',
                        color: '#94a3b8',
                        flexShrink: 0,
                      }}
                      onClick={(e) => onRemoveDoc(d, e)}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#e5484d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 弹窗底部操作栏 */}
        <div
          className="row-between items-center"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            ⚡ 提交后系统自动完成正文提取、章节切分与图表引用识别，并进入沉浸式阅读
          </span>
          <div className="row g-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={uploading}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={(!uploadFile && !uploadName.trim()) || uploading}
              style={{
                padding: '8px 20px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(27, 122, 94, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {uploading ? <span className="spinner" /> : <Icon name="check" size={14} />}
              {uploading ? '正在解析…' : '导入并解析'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
