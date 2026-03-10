import { useEffect, useState, useRef } from "react";

export interface HeaderFooterConfig {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  showPageNumber: boolean;
  pageNumberPosition: "center" | "left" | "right";
  firstPageDifferent: boolean;
}

export const defaultHeaderFooterConfig: HeaderFooterConfig = {
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "",
  footerRight: "",
  showPageNumber: false,
  pageNumberPosition: "center",
  firstPageDifferent: false,
};

interface PageHeaderFooterOverlayProps {
  config: HeaderFooterConfig;
  editorEl: HTMLElement | null;
}

/**
 * Calculates page height in px from 297mm using a temporary element.
 */
function getPageHeightPx(): number {
  const tmp = document.createElement("div");
  tmp.style.cssText = "position:absolute;visibility:hidden;width:0;height:297mm;";
  document.body.appendChild(tmp);
  const h = tmp.offsetHeight;
  document.body.removeChild(tmp);
  return h;
}

export function PageHeaderFooterOverlay({ config, editorEl }: PageHeaderFooterOverlayProps) {
  const [pageCount, setPageCount] = useState(1);
  const [pageHeightPx, setPageHeightPx] = useState(1123);
  const pageGapPx = 48;
  const rafRef = useRef(0);

  // Measure 297mm in px once
  useEffect(() => {
    setPageHeightPx(getPageHeightPx());
  }, []);

  // Observe editor height changes to recalc page count
  useEffect(() => {
    if (!editorEl) return;

    const update = () => {
      const scrollH = editorEl.scrollHeight;
      const pages = Math.max(1, Math.ceil(scrollH / pageHeightPx));
      setPageCount(pages);
    };

    update();

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    });
    ro.observe(editorEl);

    // Also listen for input to catch content changes
    const mutObs = new MutationObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    });
    mutObs.observe(editorEl, { childList: true, subtree: true, characterData: true });

    return () => {
      ro.disconnect();
      mutObs.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [editorEl, pageHeightPx]);

  const hasAnyContent =
    config.headerLeft || config.headerCenter || config.headerRight ||
    config.footerLeft || config.footerCenter || config.footerRight ||
    config.showPageNumber;

  if (!hasAnyContent) return null;

  const pageCycle = pageHeightPx + pageGapPx;

  const renderPageNumber = (pageNum: number, totalPages: number) => {
    return `Página ${pageNum} de ${totalPages}`;
  };

  return (
    <>
      {Array.from({ length: pageCount }, (_, i) => {
        const pageNum = i + 1;
        const isFirstPage = i === 0;
        const skipHeader = config.firstPageDifferent && isFirstPage;

        // Positions within the page
        const pageTop = i * pageCycle;
        const headerY = pageTop + 15; // 15px from top of page
        const footerY = pageTop + pageHeightPx - 32; // 32px from bottom of page

        // Build footer center text with optional page number
        let footerCenterText = config.footerCenter;
        if (config.showPageNumber && config.pageNumberPosition === "center") {
          const pn = renderPageNumber(pageNum, pageCount);
          footerCenterText = footerCenterText ? `${footerCenterText} — ${pn}` : pn;
        }
        let footerLeftText = config.footerLeft;
        if (config.showPageNumber && config.pageNumberPosition === "left") {
          const pn = renderPageNumber(pageNum, pageCount);
          footerLeftText = footerLeftText ? `${footerLeftText} — ${pn}` : pn;
        }
        let footerRightText = config.footerRight;
        if (config.showPageNumber && config.pageNumberPosition === "right") {
          const pn = renderPageNumber(pageNum, pageCount);
          footerRightText = footerRightText ? `${footerRightText} — ${pn}` : pn;
        }

        const hasHeader = !skipHeader && (config.headerLeft || config.headerCenter || config.headerRight);
        const hasFooter = footerLeftText || footerCenterText || footerRightText;

        return (
          <div key={i}>
            {/* Header */}
            {hasHeader && (
              <div
                className="page-header-overlay"
                style={{ top: `${headerY}px` }}
              >
                <span className="page-hf-left">{config.headerLeft}</span>
                <span className="page-hf-center">{config.headerCenter}</span>
                <span className="page-hf-right">{config.headerRight}</span>
              </div>
            )}
            {/* Footer */}
            {hasFooter && (
              <div
                className="page-footer-overlay"
                style={{ top: `${footerY}px` }}
              >
                <span className="page-hf-left">{footerLeftText}</span>
                <span className="page-hf-center">{footerCenterText}</span>
                <span className="page-hf-right">{footerRightText}</span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
