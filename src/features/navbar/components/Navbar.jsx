import {Navbar, Nav, Avatar, Text, Badge, IconButton, Dropdown, Whisper, Popover, Menu, Stack} from 'rsuite';
import {IoLogoReact, IoNotifications} from 'react-icons/io5';
import AdminIcon from '@rsuite/icons/Admin';
import {forwardRef} from "react";
import {useNavigate} from "react-router-dom";

const Brand = () => (
    <Navbar.Brand href="/briefing" color={'orange'}>
        {/*<IoLogoReact size={26}/>*/}NewsGenerator
    </Navbar.Brand>
);

export const CustomNavbar = ({user, removeAuthCredentials}) => {
    const navigate = useNavigate();
    const handleState = () => {
        if (user) {
            removeAuthCredentials()
        } else {
            navigate('/login')
        }
    }

    return (
        <Navbar appearance={'default'} width={'100%'} position={'fixed'}>
            <Navbar.Content showFrom="xs">
                <Brand/>
                <Nav>
                    <Nav.Item href={'/briefing'}>Briefing</Nav.Item>
                    <Nav.Item href={'/profile'}>Profile</Nav.Item>
                    <Nav.Item href={'/search'}>Search</Nav.Item>
                </Nav>
            </Navbar.Content>

            <Navbar.Content hideFrom="xs">
                <Navbar.Toggle/>
                <Brand/>
            </Navbar.Content>

            <Navbar.Content>
                <Whisper
                    placement="bottomEnd"
                    trigger="click"
                    speaker={(props, ref) => (
                        <RenderSpeaker
                            {...props}
                            ref={ref}
                            user={user}
                            onLogout={handleState}
                        />
                    )}
                >
                    <AdminIcon size="2rem"/>
                </Whisper>
            </Navbar.Content>
        </Navbar>
    )
};

const RenderSpeaker = forwardRef(({onClose, left, top, className, user, onLogout}, ref) => {
    const handleLogoutClick = () => {
        onLogout();
        onClose();
    };

    return (
        <Popover ref={ref} className={className} style={{left, top}} full>
            <Dropdown.Menu onSelect={onClose}>
                {user && (
                    <>
                        <Dropdown.Item panel style={{padding: 10, width: 160}}>
                            <Stack spacing={6} wrap>
                                <Text>Signed in as</Text>
                                <Text as="b">{user.username}</Text>
                            </Stack>
                            <Text muted>{user.role === 1 ? "Administrateur" : "Utilisateur"}</Text>
                        </Dropdown.Item>
                        <Dropdown.Item divider/>
                    </>
                )}
                {/*{user && (*/}
                {/*    <>*/}
                {/*        <Dropdown.Item>Profile & account</Dropdown.Item>*/}
                {/*        <Dropdown.Item divider/>*/}
                {/*    </>*/}
                {/*)}*/}
                {/*<Dropdown.Item>Settings</Dropdown.Item>*/}
                <Dropdown.Item onClick={handleLogoutClick}>{user ? "Sign out" : "Sign in"}</Dropdown.Item>
            </Dropdown.Menu>
        </Popover>
    );
});