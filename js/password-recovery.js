import { callAdmin } from "./db.js";
import { modal, esc, busy, toast } from "./ui.js";
import { icon } from "./icons.js";

export function openPasswordRecovery(player) {
  const name = player.displayName || player.username;
  let close = modal(
    "Reset password",
    `<div class="content-stack password-recovery"><p>Confirma a identidade de <strong>${esc(name)}</strong> antes de autorizar. Entrega o código apenas ao próprio jogador.</p><p class="muted">O código vale uma hora e só pode ser usado uma vez. No login, o jogador escolhe a nova palavra-passe. A atual mantém-se até concluir a recuperação.</p><div class="actions"><button type="button" id="authorize-recovery" class="btn btn-primary">${icon("resetPassword")}Autorizar e gerar código</button><button type="button" id="cancel-recovery" class="btn btn-ghost">Revogar autorização anterior</button></div></div>`,
  );
  const cancel = async (button) => {
    try {
      await busy(button, () =>
        callAdmin("passwordRecoveryAction", {
          uid: player.uid,
          action: "cancel",
        }),
      );
      close();
      toast("Autorização de recuperação revogada.");
    } catch {}
  };
  document.querySelector("#cancel-recovery").onclick = (event) =>
    cancel(event.currentTarget);
  document.querySelector("#authorize-recovery").onclick = async (event) => {
    try {
      const response = await busy(event.currentTarget, () =>
        callAdmin("passwordRecoveryAction", {
          uid: player.uid,
          action: "authorize",
        }),
      );
      const { code, expiresAt } = response.data;
      const until = new Date(expiresAt).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      close = modal(
        "Recuperação autorizada",
        `<div class="content-stack password-recovery"><p>Entrega este código a <strong>${esc(name)}</strong> por um canal conhecido.</p><label>Código de uso único<textarea id="recovery-code" rows="2" readonly autocomplete="off" spellcheck="false">${esc(code)}</textarea></label><p class="muted">Válido até às ${esc(until)}. No login: «Recuperar password», username, código e nova palavra-passe. Este código substitui qualquer autorização anterior.</p><div class="actions"><button type="button" id="copy-recovery" class="btn btn-primary">${icon("copy")}Copiar código</button><button type="button" id="revoke-recovery" class="btn btn-ghost">Revogar código</button></div><p class="small muted">O código só é mostrado agora. Se o perderes, gera outro.</p></div>`,
      );
      document.querySelector("#copy-recovery").onclick = async () => {
        try {
          await navigator.clipboard.writeText(code);
          toast("Código copiado.");
        } catch {
          document.querySelector("#recovery-code").select();
          toast("Seleciona e copia o código.");
        }
      };
      document.querySelector("#revoke-recovery").onclick = (event) =>
        cancel(event.currentTarget);
    } catch {}
  };
}
