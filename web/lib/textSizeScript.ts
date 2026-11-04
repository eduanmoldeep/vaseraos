/** Shared between the server root layout (pre-paint script) and the client text-size store. */
export const TEXT_SIZE_KEY = "vaseraos-text-size";

/** Inline, pre-paint script so the saved size applies before first render (no flash of small text). */
export const TEXT_SIZE_INIT_SCRIPT = `try{var t=localStorage.getItem("${TEXT_SIZE_KEY}");if(t==="large"||t==="xlarge")document.documentElement.dataset.textSize=t}catch(e){}`;
