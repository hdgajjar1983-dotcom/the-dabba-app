/* ===================================
   THA DABBA - Main JavaScript
   Premium Tiffin Website Interactions
   =================================== */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initLoader();
    initNavigation();
    initMobileMenu();
    initMenuTabs();
    initCustomizer();
    initScrollAnimations();
    initCalendar();
    initLucideIcons();
    initTrackingMap();
});

/* ===================================
   Loader
   =================================== */
function initLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    
    // Hide loader after page loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.classList.add('hidden');
            document.body.style.overflow = '';
        }, 800);
    });
    
    // Fallback: hide loader after 3 seconds max
    setTimeout(() => {
        loader.classList.add('hidden');
        document.body.style.overflow = '';
    }, 3000);
}

/* ===================================
   Navigation
   =================================== */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add scrolled class for glass effect
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offset = 80; // navbar height
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                closeMobileMenu();
            }
        });
    });
}

/* ===================================
   Mobile Menu
   =================================== */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMenuBtn = document.getElementById('closeMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!mobileMenuBtn || !mobileMenu) return;
    
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', closeMobileMenu);
    }
    
    // Close on link click
    mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    // Close on outside click
    mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) {
            closeMobileMenu();
        }
    });
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/* ===================================
   Menu Tabs & Dynamic Content
   =================================== */
const menuData = {
    monday: {
        theme: 'Punjabi',
        dishes: [
            { 
                name: 'Dal Makhani', 
                description: 'Creamy black lentils slow-cooked overnight with butter and aromatic spices', 
                type: 'Main Course',
                image: 'https://images.unsplash.com/photo-1755090154823-2832067d402b?w=600',
                kcal: 320, protein: 14, fiber: 8,
                large: true
            },
            { 
                name: 'Jeera Pulao', 
                description: 'Fragrant basmati rice with cumin', 
                image: 'https://images.unsplash.com/photo-1671970922492-4d2a4c7a2ffe?w=400',
                kcal: 180
            },
            { 
                name: 'Butter Naan', 
                description: 'Soft leavened bread with ghee', 
                image: 'https://images.unsplash.com/photo-1690951784638-1f9039d74a6c?w=400',
                kcal: 150
            },
            { 
                name: 'Aloo Gobi', 
                description: 'Spiced cauliflower & potatoes', 
                image: 'https://images.unsplash.com/photo-1695568179748-b4482723899b?w=400',
                kcal: 140
            },
            { 
                name: 'Gulab Jamun', 
                description: 'Sweet milk dumplings in rose syrup', 
                image: 'https://images.unsplash.com/photo-1704520836459-e12b4e6373aa?w=400',
                kcal: 180,
                accent: true
            }
        ]
    },
    tuesday: {
        theme: 'Gujarati',
        dishes: [
            { 
                name: 'Undhiyu', 
                description: 'Mixed winter vegetable curry with fenugreek dumplings', 
                type: 'Main Course',
                image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600',
                kcal: 280, protein: 10, fiber: 12,
                large: true
            },
            { 
                name: 'Khichdi', 
                description: 'Comfort rice and lentil porridge', 
                image: 'https://images.unsplash.com/photo-1606491956689-2ea866880049?w=400',
                kcal: 200
            },
            { 
                name: 'Thepla', 
                description: 'Spiced flatbread with fenugreek', 
                image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400',
                kcal: 130
            },
            { 
                name: 'Kadhi', 
                description: 'Tangy yogurt curry with pakoras', 
                image: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400',
                kcal: 160
            },
            { 
                name: 'Shrikhand', 
                description: 'Sweet saffron yogurt dessert', 
                image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400',
                kcal: 220,
                accent: true
            }
        ]
    },
    wednesday: {
        theme: 'Rajasthani',
        dishes: [
            { 
                name: 'Dal Baati Churma', 
                description: 'Signature baked wheat balls with five-lentil curry', 
                type: 'Main Course',
                image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600',
                kcal: 450, protein: 16, fiber: 10,
                large: true
            },
            { 
                name: 'Gatte Ki Sabzi', 
                description: 'Gram flour dumplings in spiced gravy', 
                image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400',
                kcal: 240
            },
            { 
                name: 'Bajra Roti', 
                description: 'Pearl millet flatbread', 
                image: 'https://images.unsplash.com/photo-1589778647885-16dcce9f7fec?w=400',
                kcal: 110
            },
            { 
                name: 'Ker Sangri', 
                description: 'Desert beans and berries', 
                image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400',
                kcal: 120
            },
            { 
                name: 'Malpua', 
                description: 'Sweet fried pancakes with rabri', 
                image: 'https://images.unsplash.com/photo-1605715020087-9ad995a8cfff?w=400',
                kcal: 280,
                accent: true
            }
        ]
    },
    thursday: {
        theme: 'Bengali',
        dishes: [
            { 
                name: 'Shorshe Ilish', 
                description: 'Hilsa fish in mustard sauce (or Paneer Shorshe for veg)', 
                type: 'Main Course',
                image: 'https://images.unsplash.com/photo-1534790566855-4cb788d389ec?w=600',
                kcal: 350, protein: 28, fiber: 2,
                large: true
            },
            { 
                name: 'Basanti Pulao', 
                description: 'Sweet saffron rice', 
                image: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400',
                kcal: 210
            },
            { 
                name: 'Luchi', 
                description: 'Deep-fried puffed bread', 
                image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400',
                kcal: 170
            },
            { 
                name: 'Aloo Posto', 
                description: 'Potatoes in poppy seed paste', 
                image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400',
                kcal: 150
            },
            { 
                name: 'Rosogolla', 
                description: 'Spongy cottage cheese balls in syrup', 
                image: 'https://images.unsplash.com/photo-1605715020087-9ad995a8cfff?w=400',
                kcal: 150,
                accent: true
            }
        ]
    },
    friday: {
        theme: 'South Indian',
        dishes: [
            { 
                name: 'Sambar Rice', 
                description: 'Tangy lentil vegetable stew with tempered rice', 
                type: 'Main Course',
                image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600',
                kcal: 290, protein: 12, fiber: 9,
                large: true
            },
            { 
                name: 'Curd Rice', 
                description: 'Cooling yogurt rice', 
                image: 'https://images.unsplash.com/photo-1596097635092-6cf9d59a4ea3?w=400',
                kcal: 180
            },
            { 
                name: 'Crispy Dosa', 
                description: 'Fermented rice crepe', 
                image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
                kcal: 140
            },
            { 
                name: 'Avial', 
                description: 'Mixed vegetables in coconut', 
                image: 'https://images.unsplash.com/photo-1574653853027-5382a3d23a57?w=400',
                kcal: 160
            },
            { 
                name: 'Payasam', 
                description: 'Vermicelli kheer with cardamom', 
                image: 'https://images.unsplash.com/photo-1571070746869-0f1c8ccb2d18?w=400',
                kcal: 200,
                accent: true
            }
        ]
    }
};

function initMenuTabs() {
    const tabs = document.querySelectorAll('.menu-tab');
    const menuGrid = document.querySelector('.menu-grid');
    
    if (!tabs.length || !menuGrid) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Get day and update menu
            const day = tab.dataset.day;
            updateMenuGrid(day);
        });
    });
}

function updateMenuGrid(day) {
    const menuGrid = document.querySelector('.menu-grid');
    if (!menuGrid || !menuData[day]) return;
    
    const data = menuData[day];
    
    // Animate out
    menuGrid.style.opacity = '0';
    menuGrid.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        // Build new menu HTML
        let html = '';
        data.dishes.forEach(dish => {
            const cardClass = `menu-card ${dish.large ? 'card-large' : ''} ${dish.accent ? 'card-accent' : ''}`;
            const macrosHtml = `
                <div class="dish-macros">
                    <span><i data-lucide="flame"></i> ${dish.kcal} kcal</span>
                    ${dish.protein ? `<span><i data-lucide="dumbbell"></i> ${dish.protein}g protein</span>` : ''}
                    ${dish.fiber ? `<span><i data-lucide="wheat"></i> ${dish.fiber}g fiber</span>` : ''}
                </div>
            `;
            
            html += `
                <div class="${cardClass}">
                    <div class="card-image">
                        <img src="${dish.image}" alt="${dish.name}" loading="lazy">
                        ${dish.type ? `<div class="card-overlay"><span class="dish-type">${dish.type}</span></div>` : ''}
                    </div>
                    <div class="card-content">
                        <h3 class="dish-name">${dish.name}</h3>
                        <p class="dish-description">${dish.description}</p>
                        ${macrosHtml}
                    </div>
                </div>
            `;
        });
        
        menuGrid.innerHTML = html;
        
        // Reinitialize icons
        if (window.lucide) {
            lucide.createIcons();
        }
        
        // Animate in
        menuGrid.style.opacity = '1';
        menuGrid.style.transform = 'translateY(0)';
    }, 300);
}

/* ===================================
   Tiffin Customizer
   =================================== */
const customizerState = {
    tiers: 4,
    selections: {
        tier1: 'Dal Makhani',
        tier2: 'Jeera Rice',
        tier3: 'Aloo Gobi',
        tier4: 'Roti (4 pcs)'
    },
    basePrice: 12.99,
    tierPrices: {
        3: 12.99,
        4: 14.99
    }
};

function initCustomizer() {
    // Tier selection
    const tierBtns = document.querySelectorAll('.tier-btn');
    tierBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tierBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            customizerState.tiers = parseInt(btn.dataset.tiers);
            updateTiffinVisual();
            updatePrice();
        });
    });
    
    // Choice selections
    document.querySelectorAll('.option-group').forEach((group, index) => {
        const choices = group.querySelectorAll('.choice-btn');
        choices.forEach(choice => {
            choice.addEventListener('click', () => {
                choices.forEach(c => c.classList.remove('active'));
                choice.classList.add('active');
                
                const tierKey = `tier${index}`;
                customizerState.selections[tierKey] = choice.textContent;
                updateTiffinVisual();
            });
        });
    });
    
    // Add to cart button
    const addToCartBtn = document.querySelector('.customizer-summary .btn-primary');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            // Show success feedback
            const originalText = addToCartBtn.innerHTML;
            addToCartBtn.innerHTML = '<i data-lucide="check"></i> Added!';
            addToCartBtn.style.background = '#3F704D';
            
            setTimeout(() => {
                addToCartBtn.innerHTML = originalText;
                addToCartBtn.style.background = '';
                if (window.lucide) lucide.createIcons();
            }, 2000);
            
            if (window.lucide) lucide.createIcons();
        });
    }
}

function updateTiffinVisual() {
    const tiers = document.querySelectorAll('.tiffin-tier');
    const tier4 = document.querySelector('.tier-4');
    
    if (customizerState.tiers === 3 && tier4) {
        tier4.style.display = 'none';
    } else if (tier4) {
        tier4.style.display = 'flex';
    }
    
    // Update tier labels
    const selections = customizerState.selections;
    tiers.forEach((tier, index) => {
        const content = tier.querySelector('.tier-content');
        if (content && selections[`tier${index + 1}`]) {
            content.textContent = selections[`tier${index + 1}`].split(' ')[0];
        }
    });
}

function updatePrice() {
    const priceEl = document.querySelector('.price-value');
    if (priceEl) {
        const price = customizerState.tierPrices[customizerState.tiers];
        priceEl.textContent = `$${price.toFixed(2)}`;
    }
}

/* ===================================
   GSAP Scroll Animations
   =================================== */
function initScrollAnimations() {
    // Check if GSAP is available
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.log('GSAP not loaded, using CSS animations');
        return;
    }
    
    gsap.registerPlugin(ScrollTrigger);
    
    // Hero animations
    gsap.from('.hero-badge', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 0.5
    });
    
    gsap.from('.hero-title .title-line', {
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.15,
        delay: 0.7
    });
    
    gsap.from('.hero-subtitle', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 1.2
    });
    
    gsap.from('.hero-cta', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 1.4
    });
    
    gsap.from('.hero-stats .stat', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.1,
        delay: 1.6
    });
    
    gsap.from('.hero-image', {
        opacity: 0,
        x: 50,
        duration: 1,
        delay: 0.8
    });
    
    // Section animations on scroll
    const sections = ['.menu-section', '.customizer-section', '.plans-section', '.delivery-section', '.testimonials-section', '.about-section'];
    
    sections.forEach(section => {
        const el = document.querySelector(section);
        if (!el) return;
        
        gsap.from(el.querySelectorAll('.section-badge, .section-title, .section-subtitle'), {
            scrollTrigger: {
                trigger: el,
                start: 'top 80%',
                toggleActions: 'play none none none'
            },
            opacity: 0,
            y: 30,
            duration: 0.8,
            stagger: 0.15
        });
    });
    
    // Menu cards stagger animation
    gsap.from('.menu-card', {
        scrollTrigger: {
            trigger: '.menu-grid',
            start: 'top 80%'
        },
        opacity: 0,
        y: 40,
        duration: 0.6,
        stagger: 0.1
    });
    
    // Plan cards animation
    gsap.from('.plan-card', {
        scrollTrigger: {
            trigger: '.plans-grid',
            start: 'top 80%'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.15
    });
    
    // Testimonial cards
    gsap.from('.testimonial-card', {
        scrollTrigger: {
            trigger: '.testimonials-grid',
            start: 'top 80%'
        },
        opacity: 0,
        y: 40,
        duration: 0.7,
        stagger: 0.12
    });
    
    // Parallax effect on hero image
    gsap.to('.hero-food-img', {
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1
        },
        y: 100,
        ease: 'none'
    });
}

/* ===================================
   Calendar Widget
   =================================== */
function initCalendar() {
    const calNavBtns = document.querySelectorAll('.cal-nav');
    const calMonth = document.querySelector('.cal-month');
    const calendarGrid = document.querySelector('.calendar-grid');
    
    if (!calNavBtns.length || !calMonth || !calendarGrid) return;
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    let currentMonth = 2; // March
    let currentYear = 2026;
    
    calNavBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (index === 0) {
                // Previous
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
            } else {
                // Next
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
            }
            
            calMonth.textContent = `${months[currentMonth]} ${currentYear}`;
            generateCalendarDays();
        });
    });
    
    function generateCalendarDays() {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
        
        let html = '';
        
        // Previous month days
        const startDay = firstDay === 0 ? 6 : firstDay - 1; // Monday start
        for (let i = startDay - 1; i >= 0; i--) {
            html += `<span class="day disabled">${prevMonthDays - i}</span>`;
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const dayOfWeek = new Date(currentYear, currentMonth, i).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Simulate delivery days (weekdays)
            let dayClass = 'day';
            if (isWeekend) {
                dayClass += '';
            } else if (Math.random() > 0.2) {
                dayClass += ' delivery';
            } else if (Math.random() > 0.5) {
                dayClass += ' skipped';
            }
            
            html += `<span class="${dayClass}">${i}</span>`;
        }
        
        // Next month days to fill grid
        const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
        const remaining = totalCells - (startDay + daysInMonth);
        for (let i = 1; i <= remaining; i++) {
            html += `<span class="day disabled">${i}</span>`;
        }
        
        calendarGrid.innerHTML = html;
        
        // Add click handlers for calendar days
        calendarGrid.querySelectorAll('.day:not(.disabled)').forEach(day => {
            day.addEventListener('click', () => {
                if (day.classList.contains('delivery')) {
                    day.classList.remove('delivery');
                    day.classList.add('skipped');
                } else if (day.classList.contains('skipped')) {
                    day.classList.remove('skipped');
                    day.classList.add('delivery');
                } else {
                    day.classList.add('delivery');
                }
            });
        });
    }
}

/* ===================================
   Lucide Icons Initialization
   =================================== */
function initLucideIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

/* ===================================
   Intersection Observer for animations
   =================================== */
function initIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements with animation class
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

/* ===================================
   Utility Functions
   =================================== */

// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(amount);
}

/* ===================================
   Console Easter Egg
   =================================== */
console.log('%c🍛 Tha Dabba', 'font-size: 24px; font-weight: bold; color: #FF9933;');
console.log('%cPremium Indian Tiffin Service', 'font-size: 14px; color: #D4AF37;');
console.log('%cMade with ❤️ in Halifax', 'font-size: 12px; color: #A0A0A0;');


/* ===================================
   Track My Dabba - Mapbox Integration
   =================================== */
function initTrackingMap() {
    const mapContainer = document.getElementById('trackingMap');
    if (!mapContainer) return;
    
    // Check if Mapbox is available
    if (typeof mapboxgl === 'undefined') {
        console.log('Mapbox GL JS not loaded, showing fallback');
        showMapFallback();
        return;
    }
    
    // Mapbox public token for demo (replace with your own for production)
    mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
    
    // Halifax coordinates
    const halifaxCenter = [-63.5752, 44.6488];
    const kitchenLocation = [-63.5849, 44.6540]; // Kitchen location
    const deliveryLocation = [-63.5650, 44.6420]; // Destination
    
    // Create map
    const map = new mapboxgl.Map({
        container: 'trackingMap',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: halifaxCenter,
        zoom: 13,
        pitch: 30
    });
    
    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Store route coordinates for animation
    let routeCoordinates = [];
    let currentPosition = 0;
    let animationId = null;
    let driverMarker = null;
    
    // Create driver marker element
    function createDriverMarker() {
        const el = document.createElement('div');
        el.className = 'mapbox-driver-marker';
        el.innerHTML = `
            <div class="driver-marker-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/>
                    <path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/>
                    <circle cx="7" cy="18" r="2"/>
                    <path d="M15 18H9"/>
                    <circle cx="17" cy="18" r="2"/>
                </svg>
            </div>
        `;
        el.style.cssText = `
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #FF9933, #D4AF37);
            border-radius: 50%;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(255, 153, 51, 0.5);
            transition: transform 0.3s ease;
        `;
        return el;
    }
    
    // Generate route between two points
    function generateRoute(start, end) {
        const steps = 100;
        const coords = [];
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Add some curve to the route
            const midLng = (start[0] + end[0]) / 2 + (Math.random() - 0.5) * 0.01;
            const midLat = (start[1] + end[1]) / 2 + (Math.random() - 0.5) * 0.01;
            
            // Quadratic bezier interpolation
            const lng = (1-t)*(1-t)*start[0] + 2*(1-t)*t*midLng + t*t*end[0];
            const lat = (1-t)*(1-t)*start[1] + 2*(1-t)*t*midLat + t*t*end[1];
            
            coords.push([lng, lat]);
        }
        
        return coords;
    }
    
    map.on('load', () => {
        // Generate route
        routeCoordinates = generateRoute(kitchenLocation, deliveryLocation);
        
        // Add kitchen marker
        new mapboxgl.Marker({
            color: '#3F704D',
            scale: 0.8
        })
            .setLngLat(kitchenLocation)
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Tha Dabba Kitchen</strong><br>Your food starts here!'))
            .addTo(map);
        
        // Add destination marker
        new mapboxgl.Marker({
            color: '#C41E3A',
            scale: 0.8
        })
            .setLngLat(deliveryLocation)
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Your Location</strong><br>Delivery destination'))
            .addTo(map);
        
        // Add route line source
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: routeCoordinates
                }
            }
        });
        
        // Add route line layer (dashed)
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            paint: {
                'line-color': '#FF9933',
                'line-width': 4,
                'line-opacity': 0.6,
                'line-dasharray': [2, 2]
            }
        });
        
        // Add animated route progress source
        map.addSource('route-progress', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            }
        });
        
        // Add route progress layer (solid)
        map.addLayer({
            id: 'route-progress-line',
            type: 'line',
            source: 'route-progress',
            paint: {
                'line-color': '#FF9933',
                'line-width': 5,
                'line-opacity': 1
            }
        });
        
        // Add driver marker at starting position
        driverMarker = new mapboxgl.Marker(createDriverMarker())
            .setLngLat(kitchenLocation)
            .addTo(map);
        
        // Fit map to show entire route
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(kitchenLocation);
        bounds.extend(deliveryLocation);
        map.fitBounds(bounds, { padding: 80 });
    });
    
    // Animate driver along route
    function animateDriver() {
        if (currentPosition >= routeCoordinates.length - 1) {
            // Animation complete
            document.getElementById('deliveryStatus').textContent = 'Delivered!';
            document.getElementById('etaCountdown').textContent = 'Arrived';
            updateTimelineStep(4);
            return;
        }
        
        currentPosition++;
        const coord = routeCoordinates[currentPosition];
        
        // Move marker
        if (driverMarker) {
            driverMarker.setLngLat(coord);
        }
        
        // Update route progress line
        const progressCoords = routeCoordinates.slice(0, currentPosition + 1);
        map.getSource('route-progress').setData({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: progressCoords
            }
        });
        
        // Update ETA countdown
        const remaining = routeCoordinates.length - currentPosition;
        const minutesRemaining = Math.ceil(remaining / routeCoordinates.length * 15);
        document.getElementById('etaCountdown').textContent = `~${minutesRemaining} min`;
        
        // Continue animation
        animationId = setTimeout(animateDriver, 100);
    }
    
    // Update timeline step
    function updateTimelineStep(step) {
        document.querySelectorAll('.timeline-step').forEach((el, index) => {
            const stepNum = index + 1;
            el.classList.remove('active', 'completed');
            
            if (stepNum < step) {
                el.classList.add('completed');
            } else if (stepNum === step) {
                el.classList.add('active');
            }
        });
        
        // Reinitialize icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    // Start demo button handler
    const startBtn = document.getElementById('startTrackingDemo');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (animationId) return; // Already running
            
            currentPosition = 0;
            document.getElementById('deliveryStatus').textContent = 'On the way!';
            updateTimelineStep(3);
            animateDriver();
            
            startBtn.innerHTML = '<i data-lucide="loader"></i> Tracking...';
            startBtn.disabled = true;
            if (window.lucide) lucide.createIcons();
        });
    }
    
    // Reset demo button handler
    const resetBtn = document.getElementById('resetDemo');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Stop animation
            if (animationId) {
                clearTimeout(animationId);
                animationId = null;
            }
            
            // Reset position
            currentPosition = 0;
            if (driverMarker) {
                driverMarker.setLngLat(kitchenLocation);
            }
            
            // Reset route progress
            if (map.getSource('route-progress')) {
                map.getSource('route-progress').setData({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                });
            }
            
            // Reset UI
            document.getElementById('deliveryStatus').textContent = 'On the way!';
            document.getElementById('etaCountdown').textContent = '~15 min';
            updateTimelineStep(3);
            
            // Reset button
            if (startBtn) {
                startBtn.innerHTML = '<i data-lucide="play"></i> Start Demo';
                startBtn.disabled = false;
                if (window.lucide) lucide.createIcons();
            }
        });
    }
}

// Fallback for when Mapbox doesn't load
function showMapFallback() {
    const mapContainer = document.getElementById('trackingMap');
    if (!mapContainer) return;
    
    mapContainer.innerHTML = `
        <div style="
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1E1E1E 0%, #121212 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 1rem;
            color: #A0A0A0;
        ">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#FF9933" stroke-width="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
            </svg>
            <p style="text-align: center; max-width: 250px;">
                Live tracking map<br>
                <span style="font-size: 0.8rem; color: #666;">Demo mode - Shows animated delivery route</span>
            </p>
        </div>
    `;
}
