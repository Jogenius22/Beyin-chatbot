import React from "react";

// import PropTypes from 'prop-types'

type AppComponentProps = {
  rootClassName?: string;
  text?: string;
  onTextClick?: (query: string) => void;
};

const AppComponent: React.FC<AppComponentProps> = ({
  rootClassName = "",
  text = "“can you tell me about your design services?” →",
  onTextClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onTextClick?.(text);
  };
  return (
    <>
      <div className={`component-container ${rootClassName} `}>
        <span className="component-text" onClick={handleClick}>
          {text}
        </span>
      </div>
      <style jsx>
        {`
          .component-container {
            flex: 0 0 auto;
            width: 32%;
            height: auto;
            display: flex;
            position: relative;
            align-items: flex-start;
            border-width: 1px !important;
            border-radius: var(--dl-radius-radius-radius8);
            justify-content: center;
            border: 1px solid rgba(251, 251, 251, 0.3);
            height: 110px;
            backdrop-filter: blur(107px);
            background-color: rgba(110, 175, 217, 0.1) !important;
          }
          .component-text {
            color: #ffffff;
            align-self: center;
            text-align: center;
            padding-top: var(--dl-space-space-oneandhalfunits);
            padding-left: var(--dl-space-space-unit);
            padding-right: var(--dl-space-space-unit);
            padding-bottom: var(--dl-space-space-oneandhalfunits);
          }
          .component-root-class-name {
            width: 32%;
          }
          .component-root-class-name1 {
            width: 32%;
          }
          .component-root-class-name2 {
            width: 32%;
          }

          @media (max-width: 479px) {
            .component-container {
              width: 80%;
            }
            .component-root-class-name {
              margin-bottom: var(--dl-space-space-unit);
            }
            .component-root-class-name1 {
              margin-bottom: var(--dl-space-space-unit);
            }
            .component-root-class-name2 {
              margin-bottom: var(--dl-space-space-unit);
            }
            .component-root-class-name3 {
              margin-bottom: var(--dl-space-space-unit);
            }
            .component-root-class-name4 {
              margin-bottom: var(--dl-space-space-unit);
            }
            .component-root-class-name5 {
              margin-bottom: var(--dl-space-space-unit);
            }
            .component-root-class-name6 {
              margin-bottom: var(--dl-space-space-unit);
            }
          }
          @media (max-width: 992px) {
            .component-container {
              margin-bottom: 2em;
              width: 95%;
            }
          }
        `}
      </style>
    </>
  );
};

// AppComponent.defaultProps = {
//   rootClassName: '',
//   text: '“can you tell me about your design services?” →',
// }

// AppComponent.propTypes = {
//   rootClassName: PropTypes.string,
//   text: PropTypes.string,
// }

export default AppComponent;
