import {mountCardoso} from './mount.mjs';
const host=document.querySelector('#preview');
const game=mountCardoso(host);
game.ready.catch(error=>{game.destroy();const message=document.createElement('p');message.className='preview-error';message.setAttribute('role','alert');message.textContent=error.message;host.replaceChildren(message);});
