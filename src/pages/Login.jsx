//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: Login.jsx
//  Description: Login Page for frontend
//

import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {LoginApi} from '@/features/login/api/loginApi.js'
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {Button} from "@/components/ui/button.jsx";
import {FieldError, Input, Label} from "@/components/ui/field.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";
import {AuthShell} from "@/features/login/components/AuthShell.jsx";
import {useAuth} from "@/features/auth/useAuth.js";

const REQUIRED = 'This field is required';

export const LoginPage = () => {
    const [formValue, setFormValue] = useState({username: '', password: ''});
    const [formError, setFormError] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    // accounts are made only when the server lets them (SIGNUP_OPEN): the link shown then only
    const [signup, setSignup] = useState(false);
    const navigate = useNavigate();
    const {refresh} = useAuth();

    useEffect(() => {
        ProfileApi.getOptions().then(answer => setSignup(answer?.signup === true)).catch(() => setSignup(false));
    }, []);

    const change = (name) => (event) => {
        setFormValue({...formValue, [name]: event.target.value});
        if (formError[name]) setFormError({...formError, [name]: null});
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        // check form submission
        const errors = {
            username: formValue.username.trim() ? null : REQUIRED,
            password: formValue.password ? null : REQUIRED,
        };
        setFormError(errors);
        if (errors.username || errors.password) return;

        // authenticate user
        setSending(true);
        try {
            const user = await LoginApi.authUser({
                username: formValue.username,
                password: formValue.password
            });

            // unknown username or wrong password: the server answers the same for both
            if (user.error && user.error.includes("Invalid username or password")) {
                toast.error('Wrong username or password...');
            } else if (user.error) {
                setError(user.error);
            }

            // if successfully retrieved user data
            // the session is in a cookie set by the answer
            if (user.id_user && await refresh()) {
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <AuthShell>
            <div className="max-w-[60rem]">
                <div>
                    <p className="kicker kicker-rule mb-6">Your daily briefing</p>
                    <h1 className="display text-balance">The news you follow, read and chosen for you.</h1>
                    <p className="standfirst mt-6">
                        Say in your own words what you follow. The AI finds the sources, chooses the stories
                        of the last days and tells you who reports them.
                    </p>
                </div>

                {/* under the title, on its left edge: beside it, the page was two columns */}
                <div className="mt-14 max-w-[24rem] md:mt-20">
                    <h2 className="section-head">Login</h2>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
                        <div>
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" name="username" autoComplete="username" value={formValue.username}
                                   onChange={change('username')} invalid={Boolean(formError.username)}
                                   aria-describedby={formError.username ? 'username-error' : undefined}/>
                            <FieldError id="username-error">{formError.username}</FieldError>
                        </div>
                        <div>
                            <div className="flex items-baseline justify-between">
                                <Label htmlFor="password">Password</Label>
                                <button type="button" className="cursor-pointer text-[0.8125rem] text-action-text hover:underline underline-offset-4"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-controls="password" aria-pressed={showPassword}>
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="off"
                                   value={formValue.password} onChange={change('password')} invalid={Boolean(formError.password)}
                                   aria-describedby={formError.password ? 'password-error' : undefined}/>
                            <FieldError id="password-error">{formError.password}</FieldError>
                        </div>

                        {error && <Notice type="error">{error}</Notice>}

                        <Button variant="primary" type="submit" className="w-full" loading={sending}>Login</Button>
                        {signup && (
                            <p className="caption">
                                Don't have an account? <Link className="link" to="/register">Sign up</Link>
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </AuthShell>
    );
}
