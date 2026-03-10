// // inspired from https://reactbits.dev/components/gooey-nav
// import { useRef, useEffect, useState } from 'react';
//
// const GooeyNav = ({
//                       items,
//                       animationTime = 600,
//                       particleCount = 15,
//                       particleDistances = [90, 10],
//                       particleR = 100,
//                       timeVariance = 300,
//                       // colors = [1, 2, 3, 1, 2, 3, 1, 4],
//                       colors = ['blue', 'red', 'green', 'blue'],
//                       initialActiveIndex = 0
//                   }) => {
//     const containerRef = useRef(null);
//     const navRef = useRef(null);
//     const filterRef = useRef(null);
//     const textRef = useRef(null);
//     const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
//
//     const noise = (n = 1) => n / 2 - Math.random() * n;
//
//     const getXY = (distance, pointIndex, totalPoints) => {
//         const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
//         return [distance * Math.cos(angle), distance * Math.sin(angle)];
//     };
//
//     const createParticle = (i, t, d, r) => {
//         let rotate = noise(r / 10);
//         return {
//             start: getXY(d[0], particleCount - i, particleCount),
//             end: getXY(d[1] + noise(7), particleCount - i, particleCount),
//             time: t,
//             scale: 1 + noise(0.2),
//             color: colors[Math.floor(Math.random() * colors.length)],
//             rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
//         };
//     };
//
//     const makeParticles = element => {
//         const d = particleDistances;
//         const r = particleR;
//         const bubbleTime = animationTime * 2 + timeVariance;
//         element.style.setProperty('--time', `${bubbleTime}ms`);
//
//         for (let i = 0; i < particleCount; i++) {
//             const t = animationTime * 2 + noise(timeVariance * 2);
//             const p = createParticle(i, t, d, r);
//             element.classList.remove('active');
//
//             setTimeout(() => {
//                 const particle = document.createElement('span');
//                 const point = document.createElement('span');
//                 particle.classList.add('particle');
//                 particle.style.setProperty('--start-x', `${p.start[0]}px`);
//                 particle.style.setProperty('--start-y', `${p.start[1]}px`);
//                 particle.style.setProperty('--end-x', `${p.end[0]}px`);
//                 particle.style.setProperty('--end-y', `${p.end[1]}px`);
//                 particle.style.setProperty('--time', `${p.time}ms`);
//                 particle.style.setProperty('--scale', `${p.scale}`);
//                 particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
//                 particle.style.setProperty('--rotate', `${p.rotate}deg`);
//
//                 point.classList.add('point');
//                 particle.appendChild(point);
//                 element.appendChild(particle);
//                 requestAnimationFrame(() => {
//                     element.classList.add('active');
//                 });
//                 setTimeout(() => {
//                     try {
//                         element.removeChild(particle);
//                     } catch {
//                         // Do nothing
//                     }
//                 }, t);
//             }, 30);
//         }
//     };
//
//     const updateEffectPosition = element => {
//         if (!containerRef.current || !filterRef.current || !textRef.current) return;
//         const containerRect = containerRef.current.getBoundingClientRect();
//         const pos = element.getBoundingClientRect();
//
//         const styles = {
//             left: `${pos.x - containerRect.x}px`,
//             top: `${pos.y - containerRect.y}px`,
//             width: `${pos.width}px`,
//             height: `${pos.height}px`
//         };
//         Object.assign(filterRef.current.style, styles);
//         Object.assign(textRef.current.style, styles);
//         textRef.current.innerText = element.innerText;
//     };
//
//     const handleClick = (e, index) => {
//         const liEl = e.currentTarget;
//         if (activeIndex === index) return;
//
//         setActiveIndex(index);
//         updateEffectPosition(liEl);
//
//         if (filterRef.current) {
//             const particles = filterRef.current.querySelectorAll('.particle');
//             particles.forEach(p => filterRef.current.removeChild(p));
//         }
//
//         if (textRef.current) {
//             textRef.current.classList.remove('active');
//
//             void textRef.current.offsetWidth;
//             textRef.current.classList.add('active');
//         }
//
//         if (filterRef.current) {
//             makeParticles(filterRef.current);
//         }
//     };
//
//     const handleKeyDown = (e, index) => {
//         if (e.key === 'Enter' || e.key === ' ') {
//             e.preventDefault();
//             const liEl = e.currentTarget.parentElement;
//             if (liEl) {
//                 handleClick({ currentTarget: liEl }, index);
//             }
//         }
//     };
//
//     useEffect(() => {
//         if (!navRef.current || !containerRef.current) return;
//         const activeLi = navRef.current.querySelectorAll('li')[activeIndex];
//         if (activeLi) {
//             updateEffectPosition(activeLi);
//             textRef.current?.classList.add('active');
//         }
//
//         const resizeObserver = new ResizeObserver(() => {
//             const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex];
//             if (currentActiveLi) {
//                 updateEffectPosition(currentActiveLi);
//             }
//         });
//
//         resizeObserver.observe(containerRef.current);
//         return () => resizeObserver.disconnect();
//     }, [activeIndex]);
//
//     return (
//         <div className="gooey-nav-container" ref={containerRef}>
//             <nav>
//                 <ul ref={navRef}>
//                     {items.map((item, index) => (
//                         <li key={index} className={activeIndex === index ? 'active' : ''}>
//                             <a href={item.href} onClick={e => handleClick(e, index)} onKeyDown={e => handleKeyDown(e, index)}>
//                                 {item.label}
//                             </a>
//                         </li>
//                     ))}
//                 </ul>
//             </nav>
//             <span className="effect filter" ref={filterRef} />
//             <span className="effect text" ref={textRef} />
//         </div>
//     );
// };
//
// export default GooeyNav;


'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize }) {
    const ref = useRef(null);
    const isHovered = useMotionValue(0);

    const mouseDistance = useTransform(mouseX, val => {
        const rect = ref.current?.getBoundingClientRect() ?? {
            x: 0,
            width: baseItemSize
        };
        return val - rect.x - baseItemSize / 2;
    });

    const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
    const size = useSpring(targetSize, spring);

    return (
        <motion.div
            ref={ref}
            style={{
                width: size,
                height: size
            }}
            onHoverStart={() => isHovered.set(1)}
            onHoverEnd={() => isHovered.set(0)}
            onFocus={() => isHovered.set(1)}
            onBlur={() => isHovered.set(0)}
            onClick={onClick}
            className={`dock-item ${className}`}
            tabIndex={0}
            role="button"
            aria-haspopup="true"
        >
            {Children.map(children, child => cloneElement(child, { isHovered }))}
        </motion.div>
    );
}

function DockLabel({ children, className = '', ...rest }) {
    const { isHovered } = rest;
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = isHovered.on('change', latest => {
            setIsVisible(latest === 1);
        });
        return () => unsubscribe();
    }, [isHovered]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -10 }}
                    exit={{ opacity: 0, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`dock-label ${className}`}
                    role="tooltip"
                    style={{ x: '-50%' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function DockIcon({ children, className = '' }) {
    return <div className={`dock-icon ${className}`}>{children}</div>;
}

export default function Dock({
                                 items,
                                 className = '',
                                 spring = { mass: 0.1, stiffness: 150, damping: 12 },
                                 magnification = 70,
                                 distance = 200,
                                 panelHeight = 68,
                                 dockHeight = 256,
                                 baseItemSize = 50
                             }) {
    const mouseX = useMotionValue(Infinity);
    const isHovered = useMotionValue(0);

    const maxHeight = useMemo(
        () => Math.max(dockHeight, magnification + magnification / 2 + 4),
        [magnification, dockHeight]
    );
    const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
    const height = useSpring(heightRow, spring);

    return (
        <motion.div style={{ height, scrollbarWidth: 'none' }} className="dock-outer">
            <motion.div
                onMouseMove={({ pageX }) => {
                    isHovered.set(1);
                    mouseX.set(pageX);
                }}
                onMouseLeave={() => {
                    isHovered.set(0);
                    mouseX.set(Infinity);
                }}
                className={`dock-panel ${className}`}
                style={{ height: panelHeight }}
                role="toolbar"
                aria-label="Application dock"
            >
                {items.map((item, index) => (
                    <DockItem
                        key={index}
                        onClick={item.onClick}
                        className={item.className}
                        mouseX={mouseX}
                        spring={spring}
                        distance={distance}
                        magnification={magnification}
                        baseItemSize={baseItemSize}
                    >
                        <DockIcon>{item.icon}</DockIcon>
                        <DockLabel>{item.label}</DockLabel>
                    </DockItem>
                ))}
            </motion.div>
        </motion.div>
    );
}
