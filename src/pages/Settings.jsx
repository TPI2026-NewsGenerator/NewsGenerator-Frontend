//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: Settings.jsx
//  Description: The settings of the account: its username and its password, each changed with the
//               password of now
//

import {useEffect, useState} from "react";
import {PageShell, Opening, Section} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {FieldError, Help, Input, Label} from "@/components/ui/field.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {AccountApi} from "@/features/auth/accountApi.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

// the rules of the server, checked here first
const USERNAME = /^[\p{L}\p{N}._-]{3,30}$/u;
const MIN_PASSWORD = 10;

// a password field with its button to show what is typed
const PasswordField = ({id, label, value, onChange, autoComplete, error, help}) => {
    const [shown, setShown] = useState(false);
    const described = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
    return (
        <div>
            <div className="flex items-baseline justify-between">
                <Label htmlFor={id}>{label}</Label>
                <button type="button" className="kicker cursor-pointer hover:text-ink" onClick={() => setShown(!shown)}
                        aria-controls={id} aria-pressed={shown}>
                    {shown ? 'Hide' : 'Show'}
                </button>
            </div>
            <Input id={id} type={shown ? 'text' : 'password'} autoComplete={autoComplete} value={value}
                   onChange={event => onChange(event.target.value)} invalid={Boolean(error)} aria-describedby={described}/>
            {help && <Help id={`${id}-help`}>{help}</Help>}
            <FieldError id={`${id}-error`}>{error}</FieldError>
        </div>
    );
};

export const SettingsPage = () => {
    const {user, refresh, logout, expired} = useAuth();
    const [name, setName] = useState({username: user?.username ?? '', password: ''});
    const [secret, setSecret] = useState({password: '', newPassword: '', again: ''});
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(null);       // 'username' or 'password'

    useEffect(() => {
        if (!user) logout();
    }, [user, logout]);

    // one change sent: the session starts again with it, and the masthead shows the new name
    const send = async (what, call, onDone) => {
        setError(null);
        setSending(what);
        try {
            const answer = await call();
            if (expired(answer)) return;
            if (answer.error) {
                setError(answer.error);
                return;
            }
            await refresh();
            onDone();
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(null);
        }
    };

    const rename = (event) => {
        event.preventDefault();
        const username = name.username.trim();
        const found = {
            username: USERNAME.test(username) ? null : '3 to 30 letters, digits, dots, dashes or underscores',
            renamePassword: name.password ? null : 'Your current password',
        };
        setErrors(found);
        if (Object.values(found).some(Boolean)) return;
        send('username', () => AccountApi.rename({username, password: name.password}), () => {
            setName({username, password: ''});
            toast.success(`You are now ${username}: sign in with this name from now on.`);
        });
    };

    const changePassword = (event) => {
        event.preventDefault();
        const found = {
            password: secret.password ? null : 'Your current password',
            newPassword: secret.newPassword.length >= MIN_PASSWORD ? null : `At least ${MIN_PASSWORD} characters`,
            again: secret.again === secret.newPassword ? null : 'Not the same as the new password',
        };
        setErrors(found);
        if (Object.values(found).some(Boolean)) return;
        send('password', () => AccountApi.changePassword({password: secret.password, newPassword: secret.newPassword}), () => {
            setSecret({password: '', newPassword: '', again: ''});
            toast.success('Your password is changed.');
        });
    };

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening kicker="Your account" title="Settings"
                     standfirst="Your username and your password. Each change asks your current password, so a session left open elsewhere is not enough to take your account."/>

            {error && (
                <div className="page mt-10">
                    <div className="grid-12">
                        <Notice type="error" onClose={() => setError(null)} className="col-span-12 md:col-span-7 md:col-start-3">{error}</Notice>
                    </div>
                </div>
            )}

            <Section kicker="Sign in" title="Your username"
                     intro={<>You sign in with it, and it is shown at the top of the pages. Your email, {user?.email}, does not change.</>}>
                <form className="grid-12 gap-y-7" onSubmit={rename} noValidate>
                    <div className="col-span-12 md:col-span-6">
                        <Label htmlFor="settings-username">Username</Label>
                        <Input id="settings-username" autoComplete="username" value={name.username}
                               onChange={event => setName({...name, username: event.target.value})}
                               invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'settings-username-error' : undefined}/>
                        <FieldError id="settings-username-error">{errors.username}</FieldError>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                        <PasswordField id="rename-password" label="Current password" autoComplete="current-password"
                                       value={name.password} onChange={password => setName({...name, password})}
                                       error={errors.renamePassword}/>
                    </div>
                    <div className="col-span-12">
                        <Button type="submit" variant="primary" loading={sending === 'username'}
                                disabled={sending !== null || name.username.trim() === user?.username}>
                            Change my username
                        </Button>
                    </div>
                </form>
            </Section>

            <Section kicker="Security" title="Your password"
                     intro={`${MIN_PASSWORD} characters at least. A sentence of a few words is easier to remember than a word with symbols, and harder to guess.`}>
                <form className="grid-12 gap-y-7" onSubmit={changePassword} noValidate>
                    <input type="text" name="username" autoComplete="username" value={user?.username ?? ''} readOnly hidden/>
                    <div className="col-span-12 md:col-span-6">
                        <PasswordField id="current-password" label="Current password" autoComplete="current-password"
                                       value={secret.password} onChange={password => setSecret({...secret, password})}
                                       error={errors.password}/>
                    </div>
                    <div className="col-span-12 md:col-span-6 md:col-start-1">
                        <PasswordField id="new-password" label="New password" autoComplete="new-password"
                                       value={secret.newPassword} onChange={newPassword => setSecret({...secret, newPassword})}
                                       error={errors.newPassword} help={`At least ${MIN_PASSWORD} characters.`}/>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                        <PasswordField id="again-password" label="New password again" autoComplete="new-password"
                                       value={secret.again} onChange={again => setSecret({...secret, again})}
                                       error={errors.again}/>
                    </div>
                    <div className="col-span-12">
                        <Button type="submit" variant="primary" loading={sending === 'password'} disabled={sending !== null}>
                            Change my password
                        </Button>
                    </div>
                </form>
            </Section>
        </PageShell>
    );
};
