import { useMemo } from "react";
import {
  issuesWithIsolatedModules,
  validationSummary,
} from "../../domain/structuralValidation";
import { useCanvasStore } from "../../state/store";

export function Review() {
  const doc = useCanvasStore((s) => s.doc)!;
  const selectModule = useCanvasStore((s) => s.selectModule);
  const setView = useCanvasStore((s) => s.setView);

  const issues = useMemo(() => issuesWithIsolatedModules(doc), [doc]);
  const { warn, info } = useMemo(() => validationSummary(issues), [issues]);

  const focusModule = (name: string | undefined) => {
    if (!name) return;
    selectModule(name);
    setView("schematic");
  };

  return (
    <div className="review-view">
      <div className="review-header">
        <h2 className="review-title">Pre-export review</h2>
        <p className="review-lead">
          Soft structural checks only — nothing here blocks saving. Use this list before sharing
          or running BioSim.
        </p>
        <div className="review-stats">
          <span className={`review-stat${warn > 0 ? " has-warn" : ""}`}>
            {warn} warning{warn !== 1 ? "s" : ""}
          </span>
          <span className="review-stat">{info} note{info !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="review-empty">
          No issues found for the current model.
        </div>
      ) : (
        <ul className="review-list">
          {issues.map((issue) => (
            <li
              key={`${issue.code}-${issue.moduleName ?? ""}-${issue.relatedModuleName ?? ""}-${issue.message.slice(0, 80)}`}
              className={`review-item review-${issue.severity}`}
            >
              <div className="review-item-top">
                <span className="review-severity">{issue.severity}</span>
                <code className="review-code">{issue.code}</code>
              </div>
              <div className="review-message">{issue.message}</div>
              {(issue.moduleName || issue.relatedModuleName) && (
                <div className="review-links">
                  {issue.moduleName && (
                    <button
                      type="button"
                      className="review-link"
                      onClick={() => focusModule(issue.moduleName)}
                    >
                      Focus: {issue.moduleName}
                    </button>
                  )}
                  {issue.relatedModuleName &&
                    issue.relatedModuleName !== issue.moduleName && (
                      <button
                        type="button"
                        className="review-link"
                        onClick={() => focusModule(issue.relatedModuleName)}
                      >
                        Focus: {issue.relatedModuleName}
                      </button>
                    )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
