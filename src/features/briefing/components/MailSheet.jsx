//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailSheet.jsx
//  Description: The sheet the editor of the e-mail opens in, whatever its layout (see MailEditor and MailMatrix): a title, the colours
//               and the way of the sentences, the stories in the middle, and under them the address and the button that sends
//

import {Dialog} from "radix-ui";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {FieldError, Input, Label} from "@/components/ui/field.jsx";
import {BriefingFormat} from "@/features/briefing/components/BriefingFormat.jsx";
import {MailTheme} from "@/features/briefing/components/MailTheme.jsx";

// the colours of the e-mail and the way its sentences are shown: they change what the preview draws
export const MailSettings = ({draft, sending}) => (
    // on a phone the labels go (the groups still have them for the screen readers): the room is for the e-mail
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 max-md:gap-y-1.5 max-md:[&_.kicker]:hidden">
        <MailTheme theme={draft.theme} onChange={draft.setTheme} disabled={sending}/>
        {draft.way && <BriefingFormat label="In the e-mail, as" format={draft.way} onChange={draft.setWay} disabled={sending}/>}
    </div>
);

// draft: see useMailDraft; onSend(address, payload): true when it went; children: the stories, in the layout chosen
export const MailSheet = ({draft, sending, onSend, children}) => (
    <Dialog.Root open onOpenChange={open => { if (!open && !sending) draft.close(); }}>
        <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0"/>
            <Dialog.Content
                            className="raised fixed inset-0 z-50 flex flex-col overflow-hidden bg-paper outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.99] md:inset-6 md:rounded-[22px] md:shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:dark:ring-1 md:dark:ring-rule">
                <header className="flex shrink-0 items-center gap-3 border-b border-rule px-4 py-2.5 md:px-5 md:py-3">
                    <Dialog.Title className="text-[1.0625rem] font-medium tracking-[-0.01em]">The e-mail</Dialog.Title>
                    <Dialog.Description className="caption">
                        {draft.count} {draft.count === 1 ? 'story' : 'stories'}, as it will be sent
                    </Dialog.Description>
                    <Dialog.Close aria-label="Close the editor" disabled={sending}
                                  className="ml-auto inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper-deep text-ink-mute transition-colors hover:text-ink">
                        <X aria-hidden className="size-4"/>
                    </Dialog.Close>
                </header>

                {children}

                <form className="shrink-0 border-t border-rule px-4 py-2.5 md:px-5 md:py-3" onSubmit={event => draft.submit(event, onSend)} noValidate>
                    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1 basis-64">
                            <Label htmlFor="mail-to">Send the {draft.count === 1 ? 'story' : `${draft.count} stories`} to</Label>
                            <Input id="mail-to" type="email" autoComplete="email" value={draft.to ?? ''}
                                   onChange={event => draft.setTo(event.target.value)} invalid={Boolean(draft.error)}
                                   aria-describedby={draft.error ? 'mail-to-error' : 'mail-to-help'}/>
                            {draft.error
                                ? <FieldError id="mail-to-error">{draft.error}</FieldError>
                                : <p id="mail-to-help" className="caption mt-1 max-md:hidden">One address. Sent to another than yours, the e-mail says it comes from you, and the answers come to you.</p>}
                            {draft.picturesError && <FieldError>{draft.picturesError}</FieldError>}
                        </div>
                        <div className="ml-auto flex gap-2 md:pb-6">
                            <Button variant="subtle" size="sm" onClick={draft.close} disabled={sending}>Cancel</Button>
                            <Button type="submit" variant="primary" size="sm" loading={sending}>Send</Button>
                        </div>
                    </div>
                </form>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
);
