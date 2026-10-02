//
//  Author: Fabian Rostello
//  Date: 29.09.2026
//  File: Signup.jsx
//  Description: A reader creates their account with their profile: the AI reads it, and the sources
//               of their briefing are searched at once
//

import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {LoginApi} from "@/features/login/api/loginApi.js";
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {AuthShell} from "@/features/login/components/AuthShell.jsx";
import {useAuth} from "@/features/auth/useAuth.js";
import {LANGUAGES, MIN_PROFILE_TEXT, PLACEHOLDER, likelyLanguage} from "@/features/briefing/profileWords.js";
import {Button} from "@/components/ui/button.jsx";
import {FieldError, Help, Input, Label, Select, Textarea} from "@/components/ui/field.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";

// the rules of the server, checked here first so the reader is told before the AI is asked
const USERNAME = /^[\p{L}\p{N}._-]{3,30}$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;

export const SignupPage = () => {
    const [options, setOptions] = useState({languages: []});
    const [form, setForm] = useState({username: '', email: '', password: '', text: '', language: ''});
    const [formError, setFormError] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();
    const {refresh} = useAuth();

    useEffect(() => {
        ProfileApi.getOptions()
            .then(answer => {
                setOptions(answer);
                // the language of the browser chosen first, when the news can be shown in it
                const first = likelyLanguage(answer.languages);
                setForm(current => current.language ? current : {...current, language: first});
            })
            .catch(err => setError(err.message));
    }, []);

    const set = (name, value) => {
        setForm(current => ({...current, [name]: value}));
        if (formError[name]) setFormError(current => ({...current, [name]: null}));
    };
    const change = (name) => (event) => set(name, event.target.value);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        const errors = {
            username: USERNAME.test(form.username.trim()) ? null : '3 to 30 letters, digits, dots, dashes or underscores',
            email: EMAIL.test(form.email.trim()) ? null : 'Enter a valid email',
            password: form.password.length >= MIN_PASSWORD ? null : `At least ${MIN_PASSWORD} characters`,
            text: form.text.trim().length >= MIN_PROFILE_TEXT ? null : `Say a little more: at least ${MIN_PROFILE_TEXT} characters`,
            language: form.language ? null : 'Choose your language',
        };
        setFormError(errors);
        if (Object.values(errors).some(Boolean)) return;

        setSending(true);
        try {
            const answer = await LoginApi.register({
                username: form.username.trim(),
                email: form.email.trim(),
                password: form.password,
                text: form.text.trim(),
                language: form.language,
            });

            if (answer.id_user) {
                await refresh();
                toast.success('Account created. The sources of your briefing are being found: a few minutes.');
                navigate('/profile');
            } else {
                setError(answer.error ?? 'The account could not be created.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    const described = (name, help = null) => [help, formError[name] ? `${name}-error` : null].filter(Boolean).join(' ') || undefined;

    return (
        <AuthShell>
            <div className="grid-12 gap-y-14">
                <div className="col-span-12 md:col-span-4">
                    <p className="kicker kicker-rule mb-6">Your daily briefing</p>
                    <h1 className="display text-balance">Tell us what you follow.</h1>
                    <p className="standfirst mt-6">
                        Your briefing is built from your own words: the AI reads them, finds the sources that
                        publish on your subjects and chooses the stories of the last two days for you.
                    </p>
                </div>

                <form className="col-span-12 space-y-10 md:col-span-7 md:col-start-6 md:mt-3 md:border-l md:border-rule md:pl-8"
                      onSubmit={handleSubmit} noValidate>
                    <fieldset className="min-w-0 space-y-7 border-0 p-0">
                        <legend className="section-head mb-8">Your account</legend>
                        <div>
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" name="username" autoComplete="username" value={form.username}
                                   onChange={change('username')} invalid={Boolean(formError.username)}
                                   aria-describedby={described('username')}/>
                            <FieldError id="username-error">{formError.username}</FieldError>
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" autoComplete="email" value={form.email}
                                   onChange={change('email')} invalid={Boolean(formError.email)}
                                   aria-describedby={described('email')}/>
                            <FieldError id="email-error">{formError.email}</FieldError>
                        </div>
                        <div>
                            <div className="flex items-baseline justify-between">
                                <Label htmlFor="password">Password</Label>
                                <button type="button" className="kicker cursor-pointer hover:text-ink"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-controls="password" aria-pressed={showPassword}>
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                                   value={form.password} onChange={change('password')} invalid={Boolean(formError.password)}
                                   aria-describedby={described('password', 'password-help')}/>
                            <Help id="password-help">At least {MIN_PASSWORD} characters.</Help>
                            <FieldError id="password-error">{formError.password}</FieldError>
                        </div>
                    </fieldset>

                    <fieldset className="min-w-0 space-y-7 border-0 p-0">
                        <legend className="section-head mb-8">What you want to read</legend>
                        <div>
                            <Label htmlFor="profile-text">In your own words</Label>
                            <Textarea id="profile-text" rows={6} className="mt-3" value={form.text} placeholder={PLACEHOLDER}
                                      onChange={change('text')} invalid={Boolean(formError.text)}
                                      aria-describedby={described('text', 'profile-text-help')}/>
                            <Help id="profile-text-help">
                                The subjects you follow, how closely, and what you don't want. You can change it later in
                                your profile.
                            </Help>
                            <FieldError id="text-error">{formError.text}</FieldError>
                        </div>
                        <div>
                            <Label htmlFor="signup-language">Your language</Label>
                            <Select id="signup-language" className="mt-2" invalid={Boolean(formError.language)}
                                    aria-describedby={described('language', 'signup-language-help')}
                                    options={options.languages.map(language => ({value: language, label: LANGUAGES[language] ?? language}))}
                                    value={form.language} onChange={change('language')}/>
                            <Help id="signup-language-help">
                                The news of every language are read for you, and translated into this one.
                            </Help>
                            <FieldError id="language-error">{formError.language}</FieldError>
                        </div>
                    </fieldset>

                    {error && <Notice type="error">{error}</Notice>}

                    <div>
                        <Button variant="primary" type="submit" className="w-full sm:w-auto" loading={sending}>Create my account</Button>
                        {sending && <p className="caption mt-3 italic">The AI reads your profile, this takes a few seconds…</p>}
                        <p className="caption mt-4">
                            Already have an account? <Link className="link" to="/login">Log in</Link>
                        </p>
                    </div>
                </form>
            </div>
        </AuthShell>
    );
};
