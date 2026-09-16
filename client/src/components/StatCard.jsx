const StatCard = ({ icon, label, value, trend, color }) => {
  return (
    <div className={`stat-card stat-card--${color || "default"}`}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__info">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
      </div>
      {trend !== undefined && (
        <span className={`stat-card__trend ${trend >= 0 ? "stat-card__trend--up" : "stat-card__trend--down"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
};

export default StatCard;
