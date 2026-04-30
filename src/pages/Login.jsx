//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: Fetch.jsx
//  Description: Login Page for frontend
//

import {useRef, useState} from "react";
import {
    HStack,
    VStack,
    Divider,
    Box,
    Card,
    Heading,
    Content,
    Center,
    Container,
    Link,
    CustomProvider,
    Button,
    PasswordInput,
    Form, Schema,
} from "rsuite";
import {Login} from '@/features/login/api/login.js'
import { useNavigate } from "react-router-dom";

const {StringType} = Schema.Types;
const model = Schema.Model({
    username: StringType().isRequired('This field is required'),
    password: StringType().isRequired('This field is required'),
});


export const LoginPage = () => {
    const formRef = useRef();
    const [formValue, setFormValue] = useState({username: '', password: ''});
    const [formError, setFormError] = useState({});
    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (!formRef.current.check()) {
            return;
        }

        // authenticate user
        const user = await Login.authUser({
            username: formValue.username,
            password: formValue.password
        })

        if (user.token) {
            localStorage.setItem("JWT", user.token);
            navigate('/fetch')
        }
    };

    return (
        <CustomProvider theme="light" alignItems={'center'}>
            <Container>
                <Content>
                    <Center>
                        <VStack alignItems={'center'} marginTop={50}>
                            <Heading level={2}>Login</Heading>
                            <Card padding={20} shaded>
                                <HStack divider={<Divider vertical/>} marginTop={50} spacing={40}
                                        align="flex-start" alignItems={'center'}>
                                    <Box>
                                        <Form layout="vertical"
                                              ref={formRef}
                                              model={model}
                                              formValue={formValue}
                                              onChange={setFormValue}
                                              onCheck={setFormError}
                                              formError={formError}
                                        >
                                            <Form.Group controlId='username'>
                                                <Form.Label>Username</Form.Label>
                                                <Form.Control
                                                    name="username"
                                                    errorPlacement={'static'}
                                                />
                                            </Form.Group>
                                            <Form.Group controlId='password'>
                                                <Form.Label>Password</Form.Label>
                                                <Form.Control
                                                    name="password"
                                                    type="password"
                                                    autoComplete="off"
                                                    accepter={PasswordInput}
                                                    errorPlacement={'static'}
                                                />
                                            </Form.Group>
                                            <Link href="/register">Don't have an account ? Sign up</Link>
                                            <Button appearance="primary" onClick={handleSubmit} marginTop={50} width={'100%'}>Login</Button>
                                        </Form>
                                    </Box>
                                </HStack>
                            </Card>
                        </VStack>
                    </Center>
                </Content>
            </Container>
        </CustomProvider>
    );
}