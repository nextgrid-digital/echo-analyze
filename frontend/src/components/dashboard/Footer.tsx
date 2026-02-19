import { memo } from "react"

export const Footer = memo(function Footer() {
  return (
    <footer className="w-full border-t border-border mt-12 sm:mt-16 py-6 sm:py-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-[10px] text-muted-foreground leading-relaxed space-y-3">
          <div>
            <p className="font-semibold uppercase tracking-wider mb-2 text-foreground">
              CONFIDENTIAL AND PROPRIETARY INFORMATION
            </p>
            <p>
              This portfolio analysis report contains confidential and proprietary
              information belonging to the investor named herein. This report is
              strictly confidential and is intended solely for the use of the investor
              and their authorized financial advisor or wealth manager.
            </p>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider mb-2 text-foreground">
              UNAUTHORIZED DISCLOSURE PROHIBITED
            </p>
            <p>
              Any unauthorized disclosure, distribution, reproduction, or sharing of
              this report, in whole or in part, by any means (including but not
              limited to electronic transmission, printing, photocopying, or verbal
              communication) is strictly prohibited and may constitute a criminal
              offense under applicable data protection laws, privacy regulations, and
              financial services legislation.
            </p>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider mb-2 text-foreground">
              LEGAL CONSEQUENCES
            </p>
            <p className="mb-2">
              Violation of this confidentiality requirement may result in:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Criminal prosecution under data protection and privacy laws</li>
              <li>Civil liability for damages</li>
              <li>Regulatory penalties and sanctions</li>
              <li>Breach of fiduciary duty claims</li>
            </ul>
            <p className="mt-2">
              This report is protected by copyright and other intellectual property
              laws. Unauthorized access, use, or distribution is strictly prohibited
              and may result in severe legal and financial consequences.
            </p>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p>
              By accessing this report, you acknowledge that you understand and agree
              to maintain the confidentiality of all information contained herein and
              will not share, distribute, or disclose this report to any unauthorized
              third party.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
})
