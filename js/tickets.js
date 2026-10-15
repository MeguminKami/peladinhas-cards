import * as DB from "./db.js";
import {
  esc,
  pageHead,
  linkButton,
  empty,
  busy,
  toast,
  confirmDialog,
} from "./ui.js";
import { formatDate } from "./utils.js";

export async function ticketsPage(ctx, id) {
  if (!id) {
    const rows = (await DB.tickets(ctx.user)).sort(
      (a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0),
    );
    ctx.render(
      `${pageHead("Apoio à liga", "Tickets", "Acompanha os teus pedidos de apoio.", linkButton("#/tickets/new", "Novo ticket", "primary", "plus"))}<label>Filtrar<select id="ticket-filter"><option value="all">Todos</option><option value="open">Abertos</option><option value="closed">Fechados</option></select></label><div id="ticket-list"></div>`,
    );
    const draw = () => {
      const filter = document.querySelector("#ticket-filter").value;
      document.querySelector("#ticket-list").innerHTML =
        rows
          .filter((t) => filter === "all" || t.status === filter)
          .map(
            (t) =>
              `<a class="game-row" href="#/tickets/${t.id}"><div><b>${esc(t.title)}</b><small>${formatDate(t.updatedAt)}</small></div><span class="pill">${t.status === "closed" ? "Fechado" : "Aberto"}</span></a>`,
          )
          .join("") ||
        empty("Sem tickets", "Os teus pedidos e conversas ficam aqui.");
    };
    document.querySelector("#ticket-filter").onchange = draw;
    draw();
    return;
  }
  if (id === "new") {
    ctx.render(
      `${pageHead("Apoio à liga", "Novo ticket", "Descreve o problema ou a dúvida.", linkButton("#/tickets", "Histórico", "ghost"))}<form id="ticket-create" class="panel"><label>Título<input name="title" required maxlength="100"></label><label>Mensagem<textarea name="body" required maxlength="4000" rows="6"></textarea></label><button class="btn btn-primary">Enviar ticket</button></form>`,
    );
    document.querySelector("#ticket-create").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await busy(e.submitter, async () => {
          const f = new FormData(e.target);
          const result = await DB.callAdmin("ticketAction", {
            action: "create",
            title: f.get("title"),
            body: f.get("body"),
          });
          ctx.go(`#/tickets/${result.data.id}`);
        });
      } catch {}
    };
    return;
  }
  const ticket = await DB.read(`tickets/${id}`);
  if (!ticket)
    return ctx.render(
      empty(
        "Ticket não encontrado",
        "Volta ao histórico.",
        linkButton("#/tickets", "Tickets"),
      ),
    );
  ctx.render(
    `${pageHead("Apoio à liga", ticket.title, "", linkButton("#/tickets", "Histórico", "ghost"))}<div class="content-stack"><div id="ticket-status"></div><div class="ticket-chat panel" id="ticket-messages" aria-live="polite"></div><div id="ticket-controls"><form id="ticket-reply" class="panel"><label>Resposta<textarea name="body" required maxlength="4000" rows="4"></textarea></label><div class="actions"><button class="btn btn-primary">Enviar resposta</button><button type="button" id="ticket-close" class="btn btn-danger">Fechar definitivamente</button></div></form></div></div>`,
  );
  const update = (t) => {
    const closed = !t || t.status === "closed";
    document.querySelector("#ticket-status").innerHTML = closed
      ? `<p>Ticket fechado definitivamente${t?.closedByName ? ` por ${esc(t.closedByName)}` : ""}. Não é possível responder ou reabrir.</p>`
      : '<p class="muted">Ticket aberto</p>';
    document.querySelector("#ticket-controls").hidden = closed;
  };
  update(ticket);
  ctx.cleanup(
    DB.watchTicket(
      id,
      update,
      (messages) => {
        document.querySelector("#ticket-messages").innerHTML = messages
          .sort(
            (a, b) =>
              (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0) ||
              (a.createdAt?.nanoseconds || 0) - (b.createdAt?.nanoseconds || 0),
          )
          .map(
            (m) =>
              `<article class="ticket-message ${m.authorId === ctx.user.uid ? "own-message" : ""}"><div><strong>${esc(m.authorName)}</strong> <span class="pill">${m.authorRole === "admin" ? "Administrador" : "Membro"}</span><small>${formatDate(m.createdAt)}</small></div><p>${esc(m.body)}</p></article>`,
          )
          .join("");
      },
      () =>
        toast(
          "Não foi possível atualizar o ticket. Tenta novamente.",
          "error",
        ),
    ),
  );
  document.querySelector("#ticket-reply").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await busy(e.submitter, async () => {
        await DB.callAdmin("ticketAction", {
          action: "reply",
          id,
          body: new FormData(e.target).get("body"),
        });
        e.target.reset();
      });
    } catch {}
  };
  document.querySelector("#ticket-close").onclick = async (e) => {
    const button = e.currentTarget;
    if (
      !(await confirmDialog(
        "Fechar definitivamente este ticket? Não poderá receber mensagens nem ser reaberto.",
      ))
    )
      return;
    try {
      await busy(button, () =>
        DB.callAdmin("ticketAction", { action: "close", id }),
      );
    } catch {}
  };
}
