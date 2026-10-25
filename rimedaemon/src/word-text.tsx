export default function WordText({text}: {text: string}) {
  return <>{text.split(/“([^”]*)”/g).map((part, index) => index % 2
    ? <em className="carried-lexeme" key={index}>{part}</em>
    : part)}</>;
}
