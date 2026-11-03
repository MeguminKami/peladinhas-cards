export const symbolNames = {
 N1:'Folha encantada',N2:'Laço de seda',N3:'Lua dourada',N4:'Coração rubi',N5:'Cristal de aurora',
 P1:'Miffy 2',P2:'Miffy 1',P3:'Misty',P4:'Príncipe João',P5:'Princesa Sofia',S:'Flor Scatter',W:'Magia Wild'
};
export const symbolAssets = Object.fromEntries(Object.entries({N1:'n1-color',N2:'n2-color',N3:'n3-color',N4:'n4-color',N5:'n5-color',P1:'miffy2-color',P2:'miffy1-color',P3:'misty-color',P4:'joao-color',P5:'sofia-color',S:'scatter-color'}).map(([id,name])=>[id,`ui/art/${name}.webp`]));
export const bonusNames={base:'Jogo normal',common:'Jardim Encantado',super:'Baile ao Luar',secret:'Coroa da Aurora'};
export const bonusAssets={common:'ui/art/bonus-common.webp',super:'ui/art/bonus-moon.webp',secret:'ui/art/bonus-secret.webp',hunt:'ui/art/bonus-hunt.webp'};
export const artAssets = [...Object.values(symbolAssets), ...Object.values(bonusAssets), ...['wild-emblem','fairy-dust','notice-frame','logo','scene'].map(name=>`ui/art/${name}.webp`)];
