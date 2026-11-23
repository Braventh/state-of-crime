export function bindNewGameConfirmation(open: EventTarget, dialog: HTMLDialogElement, cancel: EventTarget, replace: EventTarget, start: () => void) {
  open.addEventListener('click', () => dialog.showModal());
  cancel.addEventListener('click', () => dialog.close());
  replace.addEventListener('click', () => {
    dialog.close();
    start();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') event.stopPropagation();
  });
}
