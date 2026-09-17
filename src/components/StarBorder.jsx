import './StarBorder.css';

/*
 * StarBorder — from React Bits (reactbits.dev), JavaScript + CSS variant.
 * Copied as published, unchanged.
 *
 * It is rendered WITHOUT a client:* directive. The component has no hooks, no
 * state and no effects — it returns markup with inline styles, and the moving
 * highlight is a pair of CSS keyframe animations. Astro server-renders it to
 * static HTML and the animation runs with no JavaScript at all. That matters
 * here: the nav is in BaseLayout, so hydrating this would have put React's
 * 210 KB on all twenty pages for one button.
 */

const StarBorder = ({
  as: Component = 'button',
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 1,
  backgroundColor = '#000000',
  textColor = '#ffffff',
  borderColor = '#222222',
  children,
  ...rest
}) => {
  return (
    <Component
      className={`star-border-container ${className}`}
      style={{
        padding: `${thickness}px 0`,
        ...rest.style
      }}
      {...rest}
    >
      <div
        className="border-gradient-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div
        className="border-gradient-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      ></div>
      <div className="inner-content" style={{ background: backgroundColor, color: textColor, borderColor }}>
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
