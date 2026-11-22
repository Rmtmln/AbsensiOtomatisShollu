/**
 * Particle Network Animation
 * Works on both auth overlay and dashboard
 * - Auth page: Full particle network with connections
 * - Dashboard: Subtle background particles
 */

class Particle {
    constructor(ctx, width, height, opts = {}) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.isNetwork = opts.isNetwork || false;
        this.init();
    }

    init() {
        this.x = Math.random() * this.width;
        this.y = Math.random() * this.height;

        // Velocity
        const speed = this.isNetwork ? 0.4 : 0.3;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;

        // Colors from Shollu palette
        const colors = [
            { r: 59, g: 130, b: 246 },  // accent blue
            { r: 244, g: 63, b: 94 },   // red
            { r: 34, g: 197, b: 94 },   // green
            { r: 245, g: 158, b: 11 },  // amber
            { r: 6, g: 182, b: 212 }    // cyan
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];

        // Size: bigger particles as requested
        this.baseSize = this.isNetwork
            ? Math.random() * 3 + 1.5
            : Math.random() * 3.5 + 1.5;

        this.size = this.baseSize;
        this.alpha = Math.random() * 0.5 + 0.3;
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update(mouse, time) {
        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > this.width) this.vx *= -1;
        if (this.y < 0 || this.y > this.height) this.vy *= -1;

        // Keep in bounds
        this.x = Math.max(0, Math.min(this.width, this.x));
        this.y = Math.max(0, Math.min(this.height, this.y));

        // Mouse interaction — push away (antigravity)
        if (mouse.x !== null) {
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = this.isNetwork ? 150 : 120;

            if (dist < radius) {
                const force = (radius - dist) / radius;
                this.x += (dx / dist) * force * 3;
                this.y += (dy / dist) * force * 3;
            }
        }

        // Gentle pulse
        this.size = this.baseSize + Math.sin(time * this.pulseSpeed + this.pulsePhase) * 0.5;
    }

    draw() {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        ctx.fill();

        // Glow for bigger particles
        if (this.size > 2) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.08})`;
            ctx.fill();
        }
    }
}

class ParticleNetwork {
    constructor(canvasId, opts = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
        }

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.count = opts.count || 80;
        this.connectionDist = opts.connectionDist || 140;
        this.isNetwork = opts.isNetwork || false;
        this.mouse = { x: null, y: null };
        this.time = 0;
        this.animId = null;

        this.init();
        this.bindEvents();
        this.animate();
    }

    init() {
        this.resize();
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push(
                new Particle(this.ctx, this.canvas.width, this.canvas.height, {
                    isNetwork: this.isNetwork
                })
            );
        }
    }

    resize() {
        this.canvas.width = this.canvas.parentElement
            ? this.canvas.parentElement.offsetWidth
            : window.innerWidth;
        this.canvas.height = this.canvas.parentElement
            ? this.canvas.parentElement.offsetHeight
            : window.innerHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            // Re-distribute particles to new dimensions
            this.particles.forEach(p => {
                p.width = this.canvas.width;
                p.height = this.canvas.height;
                if (p.x > this.canvas.width) p.x = Math.random() * this.canvas.width;
                if (p.y > this.canvas.height) p.y = Math.random() * this.canvas.height;
            });
        });

        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    drawConnections() {
        const dist = this.connectionDist;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const a = this.particles[i];
                const b = this.particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d = Math.sqrt(dx * dx + dy * dy);

                if (d < dist) {
                    const opacity = (1 - d / dist) * 0.15;
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
                    this.ctx.lineWidth = 0.6;
                    this.ctx.moveTo(a.x, a.y);
                    this.ctx.lineTo(b.x, b.y);
                    this.ctx.stroke();
                }
            }
        }

        // Mouse connections
        if (this.mouse.x !== null) {
            for (const p of this.particles) {
                const dx = p.x - this.mouse.x;
                const dy = p.y - this.mouse.y;
                const d = Math.sqrt(dx * dx + dy * dy);

                if (d < dist * 1.5) {
                    const opacity = (1 - d / (dist * 1.5)) * 0.25;
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(244, 63, 94, ${opacity})`;
                    this.ctx.lineWidth = 0.8;
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        this.time++;

        // Clear canvas completely — no trail marks
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections first (behind particles)
        if (this.isNetwork) {
            this.drawConnections();
        }

        // Update & draw particles
        this.particles.forEach(p => {
            p.update(this.mouse, this.time);
            p.draw();
        });

        this.animId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animId) cancelAnimationFrame(this.animId);
    }
}

// ==================== INITIALIZATION ====================
let authNetwork = null;
let dashboardNetwork = null;

function initParticles() {
    // Remove old canvases
    const oldWave = document.getElementById('waveCanvas');
    if (oldWave) oldWave.remove();

    // Auth overlay particles
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) {
        let authCanvas = document.getElementById('authBgCanvas');
        if (!authCanvas) {
            authCanvas = document.createElement('canvas');
            authCanvas.id = 'authBgCanvas';
            authCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
            authOverlay.prepend(authCanvas);
        }
        if (!authNetwork) {
            authNetwork = new ParticleNetwork('authBgCanvas', {
                count: 100,
                connectionDist: 160,
                isNetwork: true
            });
        }
    }

    // Dashboard background particles
    let bgCanvas = document.getElementById('bgCanvas');
    if (!bgCanvas) {
        bgCanvas = document.createElement('canvas');
        bgCanvas.id = 'bgCanvas';
        document.body.prepend(bgCanvas);
    }
    bgCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:0.7;';
    if (!dashboardNetwork) {
        dashboardNetwork = new ParticleNetwork('bgCanvas', {
            count: 60,
            connectionDist: 120,
            isNetwork: false
        });
    }
}

document.addEventListener('DOMContentLoaded', initParticles);
