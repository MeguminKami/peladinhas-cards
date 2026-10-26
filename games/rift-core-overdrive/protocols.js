// Presentation state belongs to one spin, including all of its cascades.
export function resetProtocols(root=document){
 for(const row of root.querySelectorAll('.powers [data-power]'))row.classList.remove('active','used');
}
export function activateProtocol(row){row?.classList.add('used','active');}
export function settleProtocol(row){row?.classList.remove('active');}
