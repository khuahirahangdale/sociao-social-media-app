import "./FeaturePlaceholder.css";

const featureContent = {
  Video: {
    icon: "▷",
    title: "Videos are coming soon",
    description: "Video posts will show up here once Sociao supports sharing video.",
  },
  Inbox: {
    icon: "✉",
    title: "Your inbox is getting ready",
    description: "Direct messages are not connected to the Sociao backend yet.",
  },
};

function FeaturePlaceholder({ page }) {
  const feature = featureContent[page];

  return (
    <section className="feature-placeholder" aria-labelledby="feature-title">
      <span className="feature-placeholder-icon" aria-hidden="true">{feature.icon}</span>
      <h1 id="feature-title">{feature.title}</h1>
      <p>{feature.description}</p>
    </section>
  );
}

export default FeaturePlaceholder;
