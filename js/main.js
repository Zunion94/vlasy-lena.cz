/* Kadeřnictví Lena – interaktivní prvky webu */
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Hlavička a mobilní menu ---------- */
    function initHeader() {
        const header = $('.site-header');
        const toggle = $('.nav-toggle');
        const nav = $('#site-nav');
        if (!header) return;

        const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        if (!toggle || !nav) return;

        const setOpen = (open) => {
            document.body.classList.toggle('nav-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
        };

        toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
        nav.addEventListener('click', (e) => {
            if (e.target.closest('a')) setOpen(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
                setOpen(false);
                toggle.focus();
            }
        });
        window.matchMedia('(min-width: 881px)').addEventListener('change', (e) => {
            if (e.matches) setOpen(false);
        });
    }

    /* ---------- Zvýraznění aktivní sekce v menu ---------- */
    function initScrollSpy() {
        const links = $$('.site-nav a[data-section]');
        if (!links.length || !('IntersectionObserver' in window)) return;

        const map = new Map();
        links.forEach((link) => {
            const section = $(link.getAttribute('href'));
            if (section) map.set(section, link);
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                links.forEach((l) => l.classList.remove('is-active'));
                map.get(entry.target).classList.add('is-active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        map.forEach((_, section) => observer.observe(section));
    }

    /* ---------- Postupné zobrazování obsahu ---------- */
    function initReveal() {
        const items = $$('.reveal');
        if (!('IntersectionObserver' in window) || reduceMotion) {
            items.forEach((el) => el.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                // sourozenci se objevují s malým zpožděním za sebou
                const siblings = $$('.reveal', el.parentElement).filter((s) => s.parentElement === el.parentElement);
                const index = Math.max(0, siblings.indexOf(el));
                el.style.transitionDelay = Math.min(index * 70, 350) + 'ms';
                el.classList.add('is-visible');
                el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
                observer.unobserve(el);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

        items.forEach((el) => observer.observe(el));
    }

    /* ---------- Animované počítadlo v úvodu ---------- */
    function initCounters() {
        const counters = $$('[data-count]');
        if (!counters.length || reduceMotion || !('IntersectionObserver' in window)) return;

        const animate = (el) => {
            const target = parseFloat(el.dataset.count);
            const decimals = parseInt(el.dataset.decimals || '0', 10);
            const suffix = el.dataset.suffix || '';
            const duration = 1400;
            const start = performance.now();

            const step = (now) => {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                el.textContent = (target * eased).toFixed(decimals) + suffix;
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                animate(entry.target);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.6 });

        counters.forEach((el) => observer.observe(el));
    }

    /* ---------- Otevírací doba (čas v Praze) ---------- */
    const OPENING_HOURS = {
        0: null,
        1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18],
        6: [8, 12]
    };
    const DAY_NAMES = ['v neděli', 'v pondělí', 'v úterý', 've středu','ve čtvrtek', 'v pátek', 'v sobotu'];

    function pragueNow() {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Prague',
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hourCycle: 'h23'
        }).formatToParts(new Date());
        const get = (type) => parts.find((p) => p.type === type).value;
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        return { day, hours: parseInt(get('hour'), 10) + parseInt(get('minute'), 10) / 60 };
    }

    function openingStatus() {
        const { day, hours } = pragueNow();
        const today = OPENING_HOURS[day];

        if (today && hours >= today[0] && hours < today[1]) {
            const left = today[1] - hours;
            const text = left <= 1
                ? `Otevřeno · zavíráme v ${today[1]}:00`
                : `Nyní otevřeno do ${today[1]}:00`;
            return { open: true, text, day };
        }
        if (today && hours < today[0]) {
            return { open: false, text: `Zavřeno · otevíráme dnes v ${today[0]}:00`, day };
        }
        for (let i = 1; i <= 7; i++) {
            const next = (day + i) % 7;
            if (OPENING_HOURS[next]) {
                const when = i === 1 ? 'zítra' : DAY_NAMES[next];
                return { open: false, text: `Zavřeno · otevíráme ${when} v ${OPENING_HOURS[next][0]}:00`, day };
            }
        }
        return { open: false, text: 'Zavřeno', day };
    }

    function initOpenStatus() {
        const badges = $$('[data-open-status]');
        const rows = $$('.hours-table tr[data-days]');
        if (!badges.length && !rows.length) return;

        const update = () => {
            const status = openingStatus();
            badges.forEach((b) => {
                b.textContent = status.text;
                b.classList.toggle('is-open', status.open);
            });
            rows.forEach((row) => {
                const days = row.dataset.days.split(',').map(Number);
                row.classList.toggle('is-today', days.includes(status.day));
            });
        };
        update();
        setInterval(update, 60 * 1000);
    }

    /* ---------- Ceník: záložky a délka vlasů ---------- */
    function initPricing() {
        const tabs = $$('.tab');
        const card = $('.price-card');
        if (!tabs.length || !card) return;

        const formatPrice = (value) => Number(value).toLocaleString('cs-CZ') + ' Kč';

        const renderPrices = (length, animate) => {
            $$('.price', card).forEach((el) => {
                const value = el.dataset[length];
                const from = el.hasAttribute('data-from') ? '<small>od</small>' : '';
                const html = from + formatPrice(value);
                if (el.innerHTML === html) return;
                el.innerHTML = html;
                if (animate) {
                    el.classList.remove('is-changing');
                    void el.offsetWidth;
                    el.classList.add('is-changing');
                }
            });
        };

        const selectTab = (tab) => {
            tabs.forEach((t) => {
                const active = t === tab;
                t.classList.toggle('is-active', active);
                t.setAttribute('aria-selected', String(active));
                t.tabIndex = active ? 0 : -1;
                const panel = document.getElementById(t.getAttribute('aria-controls'));
                panel.hidden = !active;
                if (active) {
                    panel.classList.remove('is-entering');
                    void panel.offsetWidth;
                    panel.classList.add('is-entering');
                }
            });
        };

        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => selectTab(tab));
            tab.addEventListener('keydown', (e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
                next.focus();
                selectTab(next);
            });
        });

        const lengthSwitch = $('.length-switch');
        const lengthButtons = $$('.length-btn');
        lengthButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const length = btn.dataset.length;
                lengthButtons.forEach((b) => {
                    b.classList.toggle('is-active', b === btn);
                    b.setAttribute('aria-checked', String(b === btn));
                });
                lengthSwitch.dataset.active = length;
                renderPrices(length, true);
            });
        });

        renderPrices('short', false);
    }

    /* ---------- Karusel recenzí ---------- */
    function initCarousel() {
        const root = $('[data-carousel]');
        if (!root) return;

        const track = $('.carousel-track', root);
        const cards = $$('.review-card', track);
        const prev = $('.carousel-btn.prev', root);
        const next = $('.carousel-btn.next', root);
        const dotsWrap = $('.carousel-dots', root);
        let dots = [];
        let autoplay = null;
        let paused = false;
        let inView = false;

        // náhradní avatar s iniciálami, když se fotka z Googlu nenačte
        $$('.review-author img', track).forEach((img) => {
            img.addEventListener('error', () => {
                const name = img.parentElement.querySelector('b').textContent.trim();
                const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
                const avatar = document.createElement('span');
                avatar.className = 'avatar';
                avatar.setAttribute('aria-hidden', 'true');
                avatar.textContent = initials;
                img.replaceWith(avatar);
            }, { once: true });
        });

        const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
        const maxIndex = () => Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / step()));
        const currentIndex = () => Math.round(track.scrollLeft / step());

        const goTo = (index) => {
            const max = maxIndex();
            if (index > max) index = 0;
            if (index < 0) index = max;
            track.scrollTo({ left: index * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
        };

        const buildDots = () => {
            const count = maxIndex() + 1;
            if (dots.length === count) return;
            dotsWrap.innerHTML = '';
            dots = Array.from({ length: count }, (_, i) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.setAttribute('aria-label', `Recenze ${i + 1} z ${count}`);
                dot.addEventListener('click', () => { goTo(i); restart(); });
                dotsWrap.appendChild(dot);
                return dot;
            });
            dotsWrap.hidden = count < 2;
            updateDots();
        };

        const updateDots = () => {
            const index = currentIndex();
            dots.forEach((d, i) => {
                d.classList.toggle('is-active', i === index);
                d.setAttribute('aria-current', i === index ? 'true' : 'false');
            });
        };

        const start = () => {
            stop();
            if (reduceMotion || paused || !inView) return;
            autoplay = setInterval(() => goTo(currentIndex() + 1), 6000);
        };
        const stop = () => { clearInterval(autoplay); autoplay = null; };
        const restart = () => { stop(); start(); };

        prev.addEventListener('click', () => { goTo(currentIndex() - 1); restart(); });
        next.addEventListener('click', () => { goTo(currentIndex() + 1); restart(); });

        let scrollTimer;
        track.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(updateDots, 60);
        }, { passive: true });

        track.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex() + 1); restart(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex() - 1); restart(); }
        });

        const pause = () => { paused = true; stop(); };
        const resume = () => { paused = false; start(); };
        root.addEventListener('mouseenter', pause);
        root.addEventListener('mouseleave', resume);
        root.addEventListener('focusin', pause);
        root.addEventListener('focusout', resume);
        track.addEventListener('touchstart', pause, { passive: true });
        track.addEventListener('touchend', () => setTimeout(resume, 4000), { passive: true });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => {
                inView = entry.isIntersecting;
                inView ? start() : stop();
            }, { threshold: 0.3 }).observe(root);
        }
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(buildDots, 150);
        });
        buildDots();
    }

    /* ---------- Galerie: filtr a lightbox ---------- */
    function initGallery() {
        const grid = $('[data-gallery]');
        if (!grid) return;

        const items = $$('.gallery-item', grid);
        const filters = $$('.filter');

        filters.forEach((btn) => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                filters.forEach((f) => {
                    f.classList.toggle('is-active', f === btn);
                    f.setAttribute('aria-pressed', String(f === btn));
                });
                items.forEach((item) => {
                    const show = filter === 'all' || item.dataset.cat === filter;
                    if (show) {
                        item.classList.remove('is-hidden');
                        item.classList.add('is-filtering');
                        requestAnimationFrame(() => requestAnimationFrame(() => item.classList.remove('is-filtering')));
                    } else {
                        item.classList.add('is-hidden');
                    }
                });
            });
        });

        const lightbox = $('.lightbox');
        const img = $('.lb-img', lightbox);
        const counter = $('.lb-counter', lightbox);
        let visible = [];
        let index = 0;
        let lastFocus = null;

        const show = (i) => {
            index = (i + visible.length) % visible.length;
            const source = $('img', visible[index]);
            img.classList.add('is-loading');
            const loader = new Image();
            loader.onload = loader.onerror = () => {
                img.src = source.src;
                img.alt = source.alt;
                img.classList.remove('is-loading');
            };
            loader.src = source.src;
            counter.textContent = `${index + 1} / ${visible.length}`;
            // přednačtení sousedních fotek
            [index - 1, index + 1].forEach((n) => {
                const neighbour = visible[(n + visible.length) % visible.length];
                if (neighbour) new Image().src = $('img', neighbour).src;
            });
        };

        const open = (item) => {
            visible = items.filter((it) => !it.classList.contains('is-hidden'));
            lastFocus = document.activeElement;
            lightbox.hidden = false;
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => lightbox.classList.add('is-open'));
            show(visible.indexOf(item));
            $('.lb-close', lightbox).focus();
        };

        const close = () => {
            lightbox.classList.remove('is-open');
            document.body.style.overflow = '';
            setTimeout(() => { lightbox.hidden = true; }, reduceMotion ? 0 : 300);
            if (lastFocus) lastFocus.focus();
        };

        items.forEach((item) => item.addEventListener('click', () => open(item)));
        $('.lb-close', lightbox).addEventListener('click', close);
        $('.lb-prev', lightbox).addEventListener('click', () => show(index - 1));
        $('.lb-next', lightbox).addEventListener('click', () => show(index + 1));
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lb-figure')) close();
        });

        document.addEventListener('keydown', (e) => {
            if (lightbox.hidden) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowRight') show(index + 1);
            if (e.key === 'ArrowLeft') show(index - 1);
            if (e.key === 'Tab') {
                // udrží fokus uvnitř lightboxu
                const focusable = $$('button', lightbox).filter((b) => b.offsetParent !== null);
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });

        // swipe na mobilu
        let touchX = null;
        let touchY = null;
        lightbox.addEventListener('touchstart', (e) => {
            touchX = e.touches[0].clientX;
            touchY = e.touches[0].clientY;
        }, { passive: true });
        lightbox.addEventListener('touchend', (e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            const dy = e.changedTouches[0].clientY - touchY;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
            else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
            touchX = touchY = null;
        }, { passive: true });
    }

    /* ---------- Plovoucí tlačítka, kopírování, rok ---------- */
    function initFloating() {
        const toTop = $('.to-top');
        const fab = $('.fab-call');

        const onScroll = () => {
            const y = window.scrollY;
            if (toTop) toTop.classList.toggle('is-visible', y > 700);
            if (fab) {
                const nearBottom = window.innerHeight + y > document.documentElement.scrollHeight - 220;
                fab.classList.toggle('is-visible', y > 400 && !nearBottom);
            }
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        if (toTop) {
            toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
        }
    }

    function initCopy() {
        const toast = $('.toast');
        let toastTimer;
        const notify = (text) => {
            if (!toast) return;
            toast.textContent = text;
            toast.classList.add('is-visible');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
        };

        $$('[data-copy]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(btn.dataset.copy);
                    notify('E-mail zkopírován do schránky');
                } catch (err) {
                    window.location.href = 'mailto:' + btn.dataset.copy;
                }
            });
        });
    }

    function initYear() {
        $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    }

    initHeader();
    initScrollSpy();
    initReveal();
    initCounters();
    initOpenStatus();
    initPricing();
    initCarousel();
    initGallery();
    initFloating();
    initCopy();
    initYear();
})();
