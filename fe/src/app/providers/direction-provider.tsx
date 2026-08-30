'use client';

import { DirectionProvider as RadixDirProvider } from '@radix-ui/react-direction';
import { useConfig } from '@/hooks/use-config';
import { useEffect, type ReactNode } from 'react';

type DirectionProviderProps = {
    direction: 'ltr' | 'rtl';
    children: ReactNode;
};

const DirectionProvider = ({ direction, children }: DirectionProviderProps) => {
    const [, setConfig] = useConfig();

    useEffect(() => {
        setConfig((prevConfig) => ({
            ...prevConfig,
            isRtl: direction === 'rtl',
        }));

    }, [direction, setConfig]);

    return (
        <RadixDirProvider dir={direction}>
            {children}</RadixDirProvider>
    )
};

export default DirectionProvider;
