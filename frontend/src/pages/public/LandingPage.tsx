import Header from '../../components/layout/Header'
import LoginForm from '../../components/auth/LoginForm'

function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      <main>
        {/* ============================================================
            HERO
        ============================================================ */}
        <section
        id="home"
        className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:px-8"
        >
          {/* Left side */}
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
              MCCTEST Training Portal
            </p>

            <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
            Empowering Skills.
            <span className="mt-2 block text-blue-900">
                Building Futures.
            </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              A training and certification portal designed to help
              trainees manage their learning, assessment, and
              certification journey.
            </p>

            <div className="mt-8 flex flex-wrap gap-6">
                <span className="border-l-4 border-yellow-400 pl-4 text-sm font-semibold text-slate-700">
                    Training
                </span>

                <span className="border-l-4 border-yellow-400 pl-4 text-sm font-semibold text-slate-700">
                    Assessment
                </span>

                <span className="border-l-4 border-yellow-400 pl-4 text-sm font-semibold text-slate-700">
                    Certification
                </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex justify-center lg:justify-end">
            <LoginForm />
          </div>
        </section>

        {/* ============================================================
            ABOUT
        ============================================================ */}
        <section
          id="about"
          className="border-t border-slate-200 bg-slate-50"
        >
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                About MCCTEST
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Training skills for the future.
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                MCCTEST provides technical vocational training and
                certification programs designed to develop practical skills
                and prepare trainees for their chosen fields.
              </p>

              <p className="mt-4 text-base leading-7 text-slate-600">
                The MCCTEST Training Portal brings training, assessment,
                and certification information together in one place.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            PROGRAMS
        ============================================================ */}
        <section
          id="programs"
          className="border-t border-slate-200 bg-white"
        >
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                Programs
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Explore our training programs.
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Discover technical and vocational training opportunities
                available through MCCTEST.
              </p>
            </div>

            {/* Program cards will be connected to actual programs later */}
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="border border-slate-200 p-6">
                <div className="mb-4 h-1 w-12 bg-yellow-400" />

                <h3 className="text-lg font-semibold text-slate-900">
                  Technical Skills
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Develop practical and industry-relevant technical skills
                  through hands-on training.
                </p>
              </div>

              <div className="border border-slate-200 p-6">
                <div className="mb-4 h-1 w-12 bg-yellow-400" />

                <h3 className="text-lg font-semibold text-slate-900">
                  Vocational Training
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Build practical competencies for employment and
                  professional development.
                </p>
              </div>

              <div className="border border-slate-200 p-6">
                <div className="mb-4 h-1 w-12 bg-yellow-400" />

                <h3 className="text-lg font-semibold text-slate-900">
                  Certification
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Track assessment and certification progress through the
                  training portal.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            CERTIFICATE VERIFICATION
        ============================================================ */}
        <section
          id="verification"
          className="border-t border-slate-200 bg-slate-50"
        >
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
              {/* Text */}
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Certificate Verification
                </p>

                <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Verify an MCCTEST certificate.
                </h2>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                  Use the certificate verification service to confirm the
                  authenticity of an MCCTEST training certificate.
                </p>
              </div>

              {/* Verification placeholder */}
              <div className="border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Certificate Verification
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter a certificate number to verify its validity.
                </p>

                <div className="mt-6">
                  <label
                    htmlFor="certificate-number"
                    className="block text-sm font-medium text-slate-900"
                  >
                    Certificate Number
                  </label>

                  <input
                    id="certificate-number"
                    type="text"
                    placeholder="Enter certificate number"
                    className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-800 focus:ring-1 focus:ring-blue-800"
                  />
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-4 w-full bg-blue-800 px-4 py-3 text-sm font-semibold text-white opacity-50"
                >
                  Verify Certificate
                </button>

                <p className="mt-3 text-center text-xs text-slate-400">
                  Certificate verification service coming soon.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            CONTACT
        ============================================================ */}
        <section
          id="contact"
          className="border-t border-slate-200 bg-white"
        >
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                Contact
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Have questions?
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Get in touch with MCCTEST for information about training
                programs, enrollment, and certification.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Location
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  MCCTEST Training Center
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Email
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  info@mcctest.edu.ph
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Phone
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Contact information coming soon
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==============================================================
          FOOTER
      ============================================================== */}
      <footer className="border-t border-slate-200 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} MCCTEST Training Portal
          </p>

          <p>
            Training. Assessment. Certification.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage