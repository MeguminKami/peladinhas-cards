export function settle(hundredths:number,bet:number,remaining:number,scaleBps=10000){
  if(!Number.isSafeInteger(hundredths)||hundredths<0||!Number.isSafeInteger(bet)||bet<1||!Number.isSafeInteger(remaining)||remaining<0)throw Error('Liquidação inválida');
  if(!Number.isSafeInteger(scaleBps)||scaleBps<=0)throw Error('Escala inválida');
  const exact=BigInt(hundredths)*BigInt(bet)*BigInt(scaleBps)/1000000n;
  if(exact>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Pagamento excede precisão segura');
  const beforeCap=Number(exact);
  return {beforeCap,paid:Math.min(beforeCap,remaining)};
}
