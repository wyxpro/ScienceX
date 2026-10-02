/* 异步任务执行器：提交任务 → SSE 进度（TSD §3.8 / §5.4 progress 事件）→ 完成回调 */
import { useEffect, useRef, useState } from 'react';
import { taskStream } from '../api/client';
import Icon from './Icon';
import { Modal, useToast } from './ui';

export function TaskRunner({ taskId, title, onClose, onDone }: { taskId: string | null; title: string; onClose: () => void; onDone: (result: any) => void }) {
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState('准备中');
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<any>(null);
  const closedRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    if (!taskId) return;
    closedRef.current = false;
    setPercent(0); setStage('准备中'); setDone(false); setResult(null);
    const stop = taskStream(taskId, {
      onProgress: (d) => { if (!closedRef.current) { setPercent(d.percent); setStage(d.stage); } },
      onDone: (d) => {
        if (closedRef.current) return;
        setPercent(100); setDone(true); setResult(d.result);
        toast('任务完成');
        onDone?.(d.result);
      },
      onError: (m) => toast(m || '任务失败', 'err'),
    });
    return () => { closedRef.current = true; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return (
    <Modal open={!!taskId} onClose={onClose} title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="zap" size={16} />{title}</span>}
      footer={<button className="btn btn-primary" onClick={onClose} disabled={!done}>{done ? '完成' : '后台运行'}</button>}>
      <div style={{ padding: '4px 0 8px' }}>
        <div className="row-between mb-2">
          <span style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            {done ? <Icon name="check" size={16} /> : <span className="spinner spinner-dark" />}
            {stage}
          </span>
          <span className="mono text-muted">{percent}%</span>
        </div>
        <div className="progress" style={{ height: 9 }}>
          <div className="progress-bar" style={{ width: `${percent}%` }} />
        </div>
        {done && (
          <div className="anim-in" style={{ marginTop: 16 }}>
            {result?.outline && (
              <div className="card card-pad" style={{ background: 'var(--brand-softer)', borderColor: 'var(--brand-soft)' }}>
                <div className="fw-bold mb-1" style={{ fontSize: 13 }}>生成大纲</div>
                {(result.outline as string[]).map((o, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--ink-2)', padding: '2px 0' }}>{o}</div>
                ))}
              </div>
            )}
            {result?.file_name && <div className="mt-2 text-small text-muted">📄 {result.file_name}</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}
