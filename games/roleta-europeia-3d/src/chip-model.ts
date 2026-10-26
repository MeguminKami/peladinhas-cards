export const CHIP_VALUES=[1000000,500000,100000,50000,10000,5000,2500,1000,500,100,50,20,10,5,2,1];
export function chipValues(amount:number){if(!Number.isSafeInteger(amount)||amount<0)throw new Error('Valor de fichas inválido');const out:number[]=[];for(const value of CHIP_VALUES)while(amount>=value){out.push(value);amount-=value;}return out;}
export {CHIP_COLORS} from '../shared/chip-design';
