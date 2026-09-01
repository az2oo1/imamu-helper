'use client';

import React from 'react';

interface CourseBannerPatternProps {
  courseCode?: string;
  courseName?: string;
  className?: string;
}

export function getMajorType(code?: string, name?: string): 'CS' | 'MAT' | 'IT' | 'IS' | 'PHYS' | 'STAT' | 'GEN' {
  const text = `${code || ''} ${name || ''}`.toUpperCase();
  if (/(MAT|MATH|MATHEMATICS|رياضيات|تفاضل|تكامل|حساب)/i.test(text)) return 'MAT';
  if (/(CS|COMP|COMPUTER|حاسب|برمجة|خوارزميات|حوسبة|بيانات)/i.test(text)) return 'CS';
  if (/(IT|INFO|TECH|تقنية|شبكات|اتصالات|أمن)/i.test(text)) return 'IT';
  if (/(IS|SYS|SYSTEMS|نظم|قواعد)/i.test(text)) return 'IS';
  if (/(PHYS|PHYSICS|فيزياء)/i.test(text)) return 'PHYS';
  if (/(STAT|STATISTICS|إحصاء|احتمالات)/i.test(text)) return 'STAT';
  return 'GEN';
}

export function CourseBannerPattern({ courseCode, courseName, className = '' }: CourseBannerPatternProps) {
  const majorType = getMajorType(courseCode, courseName);

  return (
    <div 
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none bg-slate-100 dark:bg-zinc-950 ${className}`}
      dir="ltr"
      style={{ direction: 'ltr' }}
    >
      {/* PURE CODE VECTOR FORMULA PATTERN (NO EXTERNAL IMAGES) */}
      {/* LTR DIRECTION ENFORCED TO SPAN FULL 1000px WIDTH FROM LEFT TO RIGHT */}

      {/* 1. MATHEMATICS (MAT) */}
      {majorType === 'MAT' && (
        <svg 
          className="w-full h-full text-slate-900/75 dark:text-white/75 fill-current stroke-current font-bold" 
          viewBox="0 0 1000 200" 
          preserveAspectRatio="xMidYMid slice"
          style={{ direction: 'ltr' }}
        >
          {/* Row 1 (y=28) */}
          <g fontSize="13" fontFamily="Georgia, Cambria, 'Times New Roman', serif" fontStyle="italic" strokeWidth="0.2" textAnchor="start">
            <text x="15" y="28">lim_{`x→0`} (sin x / x) = 1</text>
            <text x="210" y="28">∫_a^b f(x)dx = F(b) - F(a)</text>
            <text x="430" y="28">f(x) = a₀/2 + ∑ (aₙ cos nx + bₙ sin nx)</text>
            <text x="730" y="28">d/dx (u·v) = u'v + uv'</text>
            <text x="890" y="28">eⁱᵖ + 1 = 0</text>
          </g>

          {/* Row 2 (y=75) */}
          <g fontSize="13" fontFamily="Georgia, Cambria, 'Times New Roman', serif" fontStyle="italic" strokeWidth="0.2" textAnchor="start">
            <text x="15" y="75">x = (-b ± √(b² - 4ac)) / 2a</text>
            <text x="250" y="75">∑_{`n=1`}^{`∞`} 1/n² = π²/6</text>
            <text x="450" y="75">∇ × B = μ₀J + μ₀ε₀ (∂E/∂t)</text>
            <text x="690" y="75">∂²u/∂t² = c² (∂²u/∂x²)</text>
            <text x="865" y="75">det(A - λI) = 0</text>
          </g>

          {/* Row 3 (y=122) */}
          <g fontSize="13" fontFamily="Georgia, Cambria, 'Times New Roman', serif" fontStyle="italic" strokeWidth="0.2" textAnchor="start">
            <text x="15" y="122">1 + 3 + 5 + ... + (2n-1) = n²</text>
            <text x="235" y="122">∫_(-∞)^∞ e⁻ˣ² dx = √π</text>
            <text x="410" y="122">(a²+b²)(c²+d²) = (ac-bd)² + (ad+bc)²</text>
            <text x="715" y="122">z² - 5z - 12 = 0</text>
            <text x="860" y="122">log_a(xy) = log a + log b</text>
          </g>

          {/* Row 4 (y=170) */}
          <g fontSize="13" fontFamily="Georgia, Cambria, 'Times New Roman', serif" fontStyle="italic" strokeWidth="0.2" textAnchor="start">
            <text x="15" y="170">sin²θ + cos²θ = 1</text>
            <text x="175" y="170">∬ᵥ (∇ · F) dV = ∯ₛ F · dS</text>
            <text x="400" y="170">z = r(cos θ + i sin θ)</text>
            <text x="600" y="170">P(A|B) = P(A ∩ B) / P(B)</text>
            <text x="810" y="170">lim_{`n→∞`} (1 + 1/n)ⁿ = e</text>
          </g>

          {/* Notebook Grid Lines */}
          <g stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.25">
            <line x1="0" y1="48" x2="1000" y2="48" />
            <line x1="0" y1="95" x2="1000" y2="95" />
            <line x1="0" y1="142" x2="1000" y2="142" />
            <line x1="190" y1="0" x2="190" y2="200" />
            <line x1="410" y1="0" x2="410" y2="200" />
            <line x1="650" y1="0" x2="650" y2="200" />
            <line x1="840" y1="0" x2="840" y2="200" />
          </g>
        </svg>
      )}

      {/* 2. COMPUTER SCIENCE (CS) */}
      {majorType === 'CS' && (
        <svg 
          className="w-full h-full text-slate-900/75 dark:text-white/75 fill-current stroke-current font-bold" 
          viewBox="0 0 1000 200" 
          preserveAspectRatio="xMidYMid slice"
          style={{ direction: 'ltr' }}
        >
          <g fontSize="12" fontFamily="Consolas, Monaco, 'Courier New', monospace" strokeWidth="0.1" textAnchor="start">
            {/* Row 1 */}
            <text x="15" y="28">quicksort(arr): O(n log n)</text>
            <text x="240" y="28">01100011 01101111 01100100 01100101</text>
            <text x="565" y="28">class Node&lt;T&gt; {`{ value: T; next: Node }`}</text>
            <text x="860" y="28">git commit -m "feat"</text>

            {/* Row 2 */}
            <text x="15" y="75">while(left &lt; right) {`{ mid = (left+right) >> 1; }`}</text>
            <text x="415" y="75">async function fetchApi(url) {`{ return await fetch(url); }`}</text>
            <text x="810" y="75">export default app;</text>

            {/* Row 3 */}
            <text x="15" y="122">Dijkstra(G, s): for v in V: dist[v] = ∞</text>
            <text x="345" y="122">const [data, setData] = useState(null);</text>
            <text x="680" y="122">npm run build --release</text>

            {/* Row 4 */}
            <text x="15" y="170">struct Tree {`{ root: Node, depth: int }`}</text>
            <text x="330" y="170">f(n) = f(n-1) + f(n-2) // Fibonacci</text>
            <text x="640" y="170">SELECT * FROM subjects WHERE active = 1;</text>
          </g>

          <g stroke="currentColor" strokeWidth="0.5" opacity="0.25">
            <rect x="10" y="12" width="210" height="24" fill="none" rx="4" strokeDasharray="2 2" />
            <rect x="335" y="105" width="310" height="26" fill="none" rx="4" strokeDasharray="2 2" />
          </g>
        </svg>
      )}

      {/* 3. INFORMATION TECHNOLOGY (IT) */}
      {majorType === 'IT' && (
        <svg className="w-full h-full text-slate-900/75 dark:text-white/75 fill-current stroke-current font-bold" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid slice" style={{ direction: 'ltr' }}>
          <g fontFamily="Consolas, Monaco, monospace" fontSize="12" strokeWidth="0.1" textAnchor="start">
            <text x="15" y="32">IP: 192.168.1.1 // GATEWAY</text>
            <text x="260" y="32">HTTP/3 QUIC PROTOCOL</text>
            <text x="510" y="32">DNS RESOLVE imamu.edu.sa</text>
            <text x="800" y="32">PORT: 443 (SSL/TLS)</text>

            <text x="15" y="92">NETMASK: 255.255.255.0</text>
            <text x="260" y="92">FIREWALL RULES: ALLOW INBOUND TCP/UDP</text>
            <text x="680" y="92">BGP ROUTE TABLE: 10.0.0.0/8</text>

            <text x="15" y="152">WI-FI 6E (6GHz) // 2.4Gbps</text>
            <text x="290" y="152">CONTAINER DOCKER RUN --RESTART ALWAYS</text>
            <text x="710" y="152">PING latency: 1ms OK</text>
          </g>
        </svg>
      )}

      {/* 4. INFORMATION SYSTEMS (IS) */}
      {majorType === 'IS' && (
        <svg className="w-full h-full text-slate-900/75 dark:text-white/75 fill-current stroke-current font-bold" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid slice" style={{ direction: 'ltr' }}>
          <g fontFamily="Consolas, Monaco, monospace" fontSize="12" strokeWidth="0.1" textAnchor="start">
            <text x="15" y="32">SELECT * FROM subjects WHERE active = 1;</text>
            <text x="360" y="32">PRIMARY KEY (id, course_code)</text>
            <text x="670" y="32">CREATE INDEX idx_major_id ON subjects;</text>

            <text x="15" y="92">INNER JOIN major_courses ON subjects.id = major_courses.subject_id</text>
            <text x="610" y="92">ERD SCHEMA // ENTITY RELATIONSHIP</text>

            <text x="15" y="152">GROUP BY major_id HAVING COUNT(*) &gt; 0;</text>
            <text x="440" y="152">DATA WAREHOUSE // ETL PIPELINE BATCH PROCESS</text>
          </g>
        </svg>
      )}

      {/* 5. PHYSICS (PHYS) */}
      {majorType === 'PHYS' && (
        <svg className="w-full h-full text-slate-900/75 dark:text-white/75 fill-current stroke-current font-bold" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid slice" style={{ direction: 'ltr' }}>
          <g fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" strokeWidth="0.1" textAnchor="start">
            <text x="15" y="32">E = hν = hc / λ</text>
            <text x="210" y="32">F = G (m₁ m₂ / r²)</text>
            <text x="430" y="32">λ = h / p (de Broglie)</text>
            <text x="680" y="32">c = 3.00 × 10⁸ m/s</text>
            <text x="870" y="32">E = mc²</text>

            <text x="15" y="92">iℏ (∂Ψ/∂t) = Ĥ Ψ</text>
            <text x="230" y="92">∇ · B = 0 // Maxwell</text>
            <text x="470" y="92">F_net = m · a</text>
            <text x="650" y="92">PV = nRT (Ideal Gas)</text>
            <text x="850" y="92">ω = √(k / m)</text>

            <text x="15" y="152">Δx · Δp ≥ ℏ / 2</text>
            <text x="220" y="152">B = (μ₀ I) / (2π r)</text>
            <text x="460" y="152">T = 2π √(L / g)</text>
            <text x="670" y="152">S = k_B ln Ω (Entropy)</text>
          </g>
        </svg>
      )}

      {/* 6. STATISTICS (STAT) */}
      {majorType === 'STAT' && (
        <svg className="w-full h-full text-slate-900/75 dark:text-white/75 fill-current stroke-current font-bold" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid slice" style={{ direction: 'ltr' }}>
          <g fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" strokeWidth="0.1" textAnchor="start">
            <text x="15" y="32">P(A|B) = P(B|A)P(A) / P(B)</text>
            <text x="270" y="32">σ² = Var(X) = E[X²] - (E[X])²</text>
            <text x="580" y="32">z = (x - μ) / σ ~ N(0, 1)</text>
            <text x="830" y="32">p-value &lt; 0.05</text>

            <text x="15" y="92">f(x) = (1 / σ√(2π)) e^(-(x-μ)² / 2σ²)</text>
            <text x="380" y="92">R² = 1 - (SSR / SST) = 0.985</text>
            <text x="700" y="92">Cov(X, Y) = E[XY] - μ_x μ_y</text>

            <text x="15" y="152">H₀: μ₁ = μ₂ vs H₁: μ₁ ≠ μ₂</text>
            <text x="310" y="152">CI = x̄ ± z_(α/2) (s / √n)</text>
            <text x="630" y="152">χ² = ∑ (O_i - E_i)² / E_i</text>
          </g>
        </svg>
      )}

      {/* 7. DEFAULT / OTHER MAJORS */}
      {majorType === 'GEN' && (
        <svg className="w-full h-full text-slate-900/75 dark:text-white/75 fill-current stroke-current font-bold" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid slice" style={{ direction: 'ltr' }}>
          <g fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" strokeWidth="0.1" textAnchor="start">
            <text x="15" y="32">∫ f(x)dx = F(x) + C</text>
            <text x="210" y="32">E = mc²</text>
            <text x="340" y="32">∑_{`n=1`}^{`∞`} 1/n² = π²/6</text>
            <text x="570" y="32">SELECT * FROM courses;</text>
            <text x="790" y="32">x = (-b ± √(b²-4ac))/2a</text>

            <text x="15" y="92">lim_{`x→0`} (sin x / x) = 1</text>
            <text x="240" y="92">01100011 01101111 01100100 01100101</text>
            <text x="560" y="92">P(A|B) = P(B|A)P(A) / P(B)</text>
            <text x="820" y="92">d/dx(eˣ) = eˣ</text>

            <text x="15" y="152">eⁱᵖ + 1 = 0</text>
            <text x="170" y="152">∂²u/∂t² = c² (∂²u/∂x²)</text>
            <text x="430" y="152">quicksort(arr) O(n log n)</text>
            <text x="690" y="152">det(A - λI) = 0</text>
          </g>
        </svg>
      )}
    </div>
  );
}
