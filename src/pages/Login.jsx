//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: Login.jsx
//  Description: Login Page for frontend
//

import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {LoginApi} from '@/features/login/api/loginApi.js'
import {Button} from "@/components/ui/button.jsx";
import {FieldError, Input, Label} from "@/components/ui/field.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";

const REQUIRED = 'This field is required';

export const LoginPage = () => {
    const [formValue, setFormValue] = useState({username: '', password: ''});
    const [formError, setFormError] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();

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

            // if wrong password
            if (user.error && user.error.includes("Invalid password...")) {
                toast.error('Wrong password...');
            } else if (user.error) {
                setError(user.error);
            }

            // if successfully retrieved user data
            if (user.token) {
                localStorage.setItem("JWT", user.token);
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b-[3px] border-double border-ink">
                <div className="page flex items-end justify-between gap-6 pt-6 pb-4">
                    <span className="font-display text-[2rem] leading-none font-medium tracking-[-0.015em] md:text-[2.6rem]">NewsGenerator</span>
                    <span className="folio hidden sm:block">
                        {new Date().toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
                    </span>
                </div>
            </header>

            <main className="page flex-1 pt-14 pb-24 md:pt-24">
                <div className="grid-12 gap-y-14">
                    <div className="col-span-12 md:col-span-6">
                        <p className="kicker kicker-rule mb-6">Your daily briefing</p>
                        <h1 className="display text-balance">The news you follow, read and chosen for you.</h1>
                        <p className="standfirst mt-6">
                            Say in your own words what you follow. The AI finds the sources, chooses the stories
                            of the last two days and tells you who reports them.
                        </p>
                    </div>

                    <div className="col-span-12 md:col-span-4 md:col-start-9 md:mt-3 md:border-l md:border-rule md:pl-8">
                        <h2 className="section-head">Login</h2>
                        <form className="mt-8 space-y-7" onSubmit={handleSubmit} noValidate>
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
                                    <button type="button" className="kicker cursor-pointer hover:text-ink"
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
                            <p className="caption">
                                Don't have an account? <Link className="link" to="/register">Sign up</Link>
                            </p>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
