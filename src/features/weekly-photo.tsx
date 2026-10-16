import { AdminMenu } from '../app/Chrome';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PageContext, Player } from '../types';
import * as DB from '../../js/db.js';
import { PHOTO_FIELDS, defaultPhotoDesign } from '../../js/card-photo.js';
import { cardWeek } from '../../js/card-week.js';
import { themeName } from '../../js/utils.js';
import { friendlyError } from '../../js/ui.js';
import { Card } from '../presentation/cards';
import { Icon, LinkButton, PageHead } from '../shared/ui';
import { toast } from '../shared/overlays';

type Design = Record<string, number | string> & { fit: string; fade: string };
interface Photo { photoURL: string; design?: Design }
const fields = PHOTO_FIELDS as [string, string, number, number, number][];
export function WeeklyPhotoPage({ ctx, player }: { ctx: PageContext; player: Player }) {
  const cycle = ctx.league.cycle || cardWeek();
  const locked = cycle.phase !== 'open' || !!player.cardLocked;
  const original = player.cardPhoto as Photo | null;
  const theme = player.specials?.[0]?.id || player.cardType || 'bronze-common';
  const [design, setDesign] = useState<Design>(() => ({ ...defaultPhotoDesign(), ...original?.design }));
  const [photoURL, setPhotoURL] = useState(original?.photoURL || '');
  const [file, setFile] = useState<File | null>(null);
  const [objectURL, setObjectURL] = useState('');
  const [pending, setPending] = useState(false);
  const [tool, setTool] = useState<'move' | 'size' | 'zoom'>('move');
  const fileInput = useRef<HTMLInputElement>(null);
  const activeURL = useRef('');
  const drag = useRef<{ pointer: number; x: number; y: number; design: Design; rect: DOMRect } | null>(null);
  const release = () => { if (activeURL.current) URL.revokeObjectURL(activeURL.current); activeURL.current = ''; setObjectURL(''); };
  useEffect(() => () => { if (activeURL.current) URL.revokeObjectURL(activeURL.current); }, []);
  const clamp = (key: string, value: number) => { const field = fields.find(([name]) => name === key); return field ? Math.max(field[2], Math.min(field[3], value)) : value; };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (locked || pending) return;
    const draft = { photoURL: photoURL.trim(), design: { ...design } };
    setPending(true);
    try {
      const imageBase64 = file ? await DB.prepareWeeklyCardPhoto(file) : undefined;
      const result = await DB.callAdmin('saveWeeklyCardPhoto', { uid: player.uid, weekId: cycle.weekId, ...draft, ...(imageBase64 ? { imageBase64 } : {}) });
      const url = result.data.photoURL ?? draft.photoURL;
      player.cardPhoto = { ...draft, photoURL: url };
      setPhotoURL(url); setFile(null); if (fileInput.current) fileInput.current.value = ''; release();
      toast('Fotografia semanal guardada.');
    } catch (error) { toast(friendlyError(error), 'error'); }
    finally { setPending(false); }
  };
  const reset = async () => {
    if (locked || pending) return; setPending(true);
    try { await DB.callAdmin('saveWeeklyCardPhoto', { uid: player.uid, weekId: cycle.weekId, reset: true }); player.cardPhoto = null; setFile(null); release(); setPhotoURL(''); if (fileInput.current) fileInput.current.value = ''; setDesign(defaultPhotoDesign()); toast('A carta usa novamente a fotografia do perfil.'); }
    catch (error) { toast(friendlyError(error), 'error'); }
    finally { setPending(false); }
  };
  return <><PageHead tag="Perfil do jogador" title="Editar foto de carta" description={player.displayName || player.username} action={<LinkButton href={`#/player/${player.uid}`} type="secondary" symbol="players">Voltar ao perfil</LinkButton>} /><AdminMenu/><section className="panel card-types-toolbar"><span className={`pill ${locked ? 'warning' : 'success'}`}>{cycle.weekId} · {locked ? 'Fechada' : 'Aberta'}</span><span>Tipo atual: <b>{themeName(theme)}</b></span></section><div className="weekly-photo-layout"><section className="panel weekly-photo-stage"><div className="section-head"><h2 id="weekly-preview-type">{themeName(theme)}</h2><span className="pill">Pré-visualização</span></div><div id="weekly-card-preview" tabIndex={0} aria-label="Fotografia da carta: usa as setas para mover" onPointerDown={event => {
    if (locked || pending || !(event.target instanceof Element) || !event.target.closest('.card-photo')) return;
    event.preventDefault(); const card = event.currentTarget.firstElementChild; if (!card) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, design: { ...design }, rect: card.getBoundingClientRect() }; event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={event => {
    const start = drag.current; if (!start || start.pointer !== event.pointerId) return;
    const dx = (event.clientX - start.x) / start.rect.width * 100, dy = (event.clientY - start.y) / start.rect.height * 100;
    if (tool === 'move') setDesign(current => ({ ...current, photoX: clamp('photoX', Number(start.design.photoX) + dx), photoY: clamp('photoY', Number(start.design.photoY) + dy) }));
    else if (tool === 'size') { const width = clamp('photoWidth', Number(start.design.photoWidth) + dx); setDesign(current => ({ ...current, photoWidth: width, photoHeight: clamp('photoHeight', Number(start.design.photoHeight) * width / Number(start.design.photoWidth)) })); }
    else setDesign(current => ({ ...current, photoScale: clamp('photoScale', Number(start.design.photoScale) - dy * 2) }));
  }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => {
    if (locked || pending || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); const key = ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 'photoX' : 'photoY'; const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 2 : -2; setDesign(current => ({ ...current, [key]: clamp(key, Number(current[key]) + direction) }));
  }}><Card player={{ ...player, cardPhoto: { photoURL: objectURL || photoURL.trim(), design } }} size="lg" theme={theme} photoPreviewURL={objectURL || undefined} preview /></div><p className="muted small">O tipo de carta depende do desempenho nos jogos.</p></section><section className="panel weekly-photo-editor"><h2>Fotografia desta semana</h2><p className="muted">A fotografia do perfil mantém-se independente.</p>{locked && <p className="pill warning">Carta fechada: fotografia bloqueada.</p>}<form id="weekly-photo-form" onSubmit={event => void submit(event)}><fieldset disabled={locked || pending}><label>Carregar imagem<input ref={fileInput} name="file" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
    const next = event.target.files?.[0]; if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > 5 * 1024 * 1024) { toast('Escolhe uma imagem JPG, PNG ou WebP até 5 MB.', 'error'); event.target.value = ''; return; }
    release(); setFile(next); const url = URL.createObjectURL(next); activeURL.current = url; setObjectURL(url);
  }} /></label><p className="muted small">JPG, PNG ou WebP até 5 MB. Mantém proporções e transparência.</p><label>Ou usar URL de imagem<input name="photoURL" type="url" placeholder="https://…" value={photoURL} maxLength={2000} onChange={event => { setPhotoURL(event.target.value); setFile(null); release(); if (fileInput.current) fileInput.current.value = ''; }} /></label><div className="weekly-photo-tools">{(['move', 'size', 'zoom'] as const).map(value => <button key={value} type="button" data-photo-tool={value} className="btn btn-secondary" aria-pressed={tool === value} onClick={() => setTool(value)}>{value === 'move' ? <><Icon name="arrow" /> Mover</> : value === 'size' ? 'Tamanho' : 'Ampliar'}</button>)}</div><p className="muted small" id="weekly-photo-help">{{ move: 'Arrasta a fotografia na carta ou usa as setas.', size: 'Arrasta para a direita para aumentar o tamanho.', zoom: 'Arrasta para cima para aproximar a imagem.' }[tool]}</p><div className="weekly-photo-ranges">{fields.map(([key, label, min, max]) => <label key={key}>{label}<input type="range" name={key} min={min} max={max} step={1} value={design[key]} onChange={event => setDesign(current => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div><div className="form-grid"><label>Enquadramento<select name="fit" value={design.fit} onChange={event => setDesign(current => ({ ...current, fit: event.target.value }))}><option value="cover">Preencher</option><option value="contain">Imagem completa</option></select></label><label>Recorte inferior<select name="fade" value={design.fade} onChange={event => setDesign(current => ({ ...current, fade: event.target.value }))}><option value="soft">Suave</option><option value="none">Sem efeito</option></select></label></div><div className="actions"><button id="save-weekly-photo" className={`btn btn-primary${pending ? ' is-loading' : ''}`} aria-busy={pending}>Guardar fotografia semanal</button><button type="button" id="reset-weekly-photo" className="btn btn-secondary" onClick={() => void reset()}>Usar fotografia do perfil</button></div></fieldset></form></section></div></>;
}
