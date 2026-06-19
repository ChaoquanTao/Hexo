/* eslint-disable */
/**
 * mermaid-filter.js
 *
 * Hexo's built-in highlight captures ```mermaid``` blocks before the renderer,
 * wrapping them in <figure class="highlight plaintext">...</figure>.
 *
 * This filter converts them back to <pre class="mermaid"> containers.
 *
 * IMPORTANT: Do NOT decode HTML entities (&lt; &gt; &amp; &quot; etc.).
 * Leave them as-is so the browser doesn't parse <br/> etc. as real HTML
 * elements inside the <pre>. The browser decodes entities to text, and
 * mermaid.js reads innerHTML + runs its own entityDecode(), so the final
 * diagram source is correct.
 */
'use strict';

hexo.extend.filter.register('after_post_render', function (data) {
  data.content = data.content.replace(
    /<figure class="highlight (?:mermaid|plaintext)"[\s\S]*?<td class="code"><pre>([\s\S]*?)<\/pre>[\s\S]*?<\/figure>/g,
    function (match, codeBlock) {
      // 1. Replace Hexo's <br> line-separators with actual newlines
      const withNewlines = codeBlock.replace(/<br\s*\/?>/gi, '\n');

      // 2. Strip all remaining HTML tags (span.line, etc.) but keep entities as-is
      //    e.g. --&gt; stays --&gt;  and  &lt;br/&gt; stays &lt;br/&gt;
      //    The browser decodes them to text; mermaid.js then reads innerHTML
      //    and runs its own entityDecode before parsing the diagram.
      const content = withNewlines.replace(/<[^>]+>/g, '').trim();

      // 3. Only convert blocks that begin with a known mermaid directive
      //    (handles %%{init:...}%% blocks too)
      const mermaidPattern = /^(flowchart|graph\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|requirementDiagram|%%)/;
      if (mermaidPattern.test(content)) {
        return `<pre class="mermaid">${content}</pre>`;
      }
      return match;
    }
  );
  return data;
});
