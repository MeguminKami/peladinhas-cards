import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from './ui';

interface ModalState {id:number; title:string; body:ReactNode; onClose:()=>void}
interface ToastState {id:number; message:string; type:string}
export interface Overlays {
 modal(title:string, body:ReactNode, onClose?:()=>void):()=>void;
 closeModal():void;
 toast(message:string,type?:string):void;
 confirm(text:string):Promise<boolean>;
}
const Context=createContext<Overlays|null>(null);
let sequence=0;
let current:Overlays|null=null;
export const modal:Overlays['modal']=(...args)=>{if(!current)throw Error('OverlaysProvider indisponível');return current.modal(...args)};
export const toast:Overlays['toast']=(...args)=>current?.toast(...args);
export const closeModal=()=>current?.closeModal();
export const confirmDialog=(text:string)=>current?.confirm(text)??Promise.resolve(false);
export function useOverlays(){const value=useContext(Context);if(!value)throw Error('É necessário OverlaysProvider');return value}
export function OverlaysProvider({children}:{children:ReactNode}){
 const [active,setActive]=useState<ModalState|null>(null),[toasts,setToasts]=useState<ToastState[]>([]);
 const activeRef=useRef<ModalState|null>(null),dialogRef=useRef<HTMLElement|null>(null),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const close=useCallback(()=>{const previous=activeRef.current;if(!previous)return;activeRef.current=null;setActive(null);previous.onClose()},[]);
 const open=useCallback<Overlays['modal']>((title,body,onClose=()=>{})=>{
  close();const next={id:++sequence,title,body,onClose};activeRef.current=next;setActive(next);
  return ()=>{if(activeRef.current?.id===next.id)close()};
 },[close]);
 const notify=useCallback((message:string,type='success')=>{const id=++sequence;setToasts(items=>[...items.slice(-1),{id,message,type}]);const timer=setTimeout(()=>{setToasts(items=>items.filter(item=>item.id!==id));timers.current.delete(timer)},5000);timers.current.add(timer)},[]);
 const confirm=useCallback((text:string)=>new Promise<boolean>(resolve=>{
  let accepted=false;
  const dismiss=open('Confirmar ação',<><p>{text}</p><div className="actions"><button id="cancel" className="btn btn-secondary" onClick={()=>dismiss()}>Cancelar</button><button id="confirm" className="btn btn-danger" onClick={()=>{accepted=true;dismiss()}}>Confirmar</button></div></>,()=>resolve(accepted));
 }),[open]);
 const value:Overlays={modal:open,closeModal:close,toast:notify,confirm};
 current=value;
 useEffect(()=>()=>{for(const timer of timers.current)clearTimeout(timer);activeRef.current?.onClose();current=null},[]);
 useEffect(()=>{
  if(!active)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const modalRoot=document.querySelector('#modal-root');
  const background=Array.from(document.body.children).filter((element):element is HTMLElement=>element instanceof HTMLElement&&element!==modalRoot&&!element.inert);
  for(const element of background)element.inert=true;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
  return ()=>{for(const element of background)element.inert=false;document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true})};
 },[active?.id]);
 const modalRoot=document.getElementById('modal-root'),toastRoot=document.getElementById('toast-region');
 return <Context.Provider value={value}>{children}{modalRoot&&active&&createPortal(<div className="backdrop" onClick={event=>{if(event.target===event.currentTarget)close()}}><section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-label={active.title} onKeyDown={event=>{
  if(event.key==='Escape'){event.stopPropagation();close()}
  if(event.key!=='Tab')return;
  const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,summary,[tabindex="0"]')).filter(element=>!element.hasAttribute('disabled')&&!element.closest('[hidden]')&&element.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
 }}><button type="button" className="btn btn-icon btn-ghost close-modal" aria-label="Fechar" onClick={close}><Icon name="close"/></button><h2>{active.title}</h2>{active.body}</section></div>,modalRoot)}{toastRoot&&createPortal(<>{toasts.map(item=><div key={item.id} className={`toast ${item.type}`} role={item.type==='error'?'alert':'status'}>{item.message}</div>)}</>,toastRoot)}</Context.Provider>;
}
