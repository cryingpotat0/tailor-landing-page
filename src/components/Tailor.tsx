import { faEye, faAlignJustify, faPencil, faScissors, type IconDefinition, faLink, faCheckCircle, faCross, faXmarkCircle, faMagic, faMagicWandSparkles } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getBox } from "css-box-model";
import { useCallback, useEffect, useRef, useState } from "react";

enum Status {
  idle,
  inspecting,
  selected,
}


const useMousePosition = () => {
  const [
    mousePosition,
    setMousePosition
  ] = useState<{
    x: number,
    y: number,
  }>({ x: 0, y: 0 });
  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);
  return mousePosition;
};


const disableClicks = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

type State = {
  status: Status.idle
} | {
  status: Status.inspecting
} | {
  status: Status.selected
  mouseX: number
  mouseY: number
};

// We need to contextify this already lol.
// state is sooo 2023.
function Canvas() {
  const [state, setStatus] = useState<State>({
    status: Status.idle
  });
  const [current, setCurrent] = useState<HTMLElement | null>(null);
  const [tool, setTool] = useState<Tool | undefined>(undefined);

  const trackElements = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    for (const element of document.querySelectorAll('.exclude-tracking')) {
      if (element.contains(target)) {
        return;
      }
    }
    if (target) {
      setCurrent((prevTarget) => {
        if (prevTarget) {
          prevTarget.removeEventListener('click', disableClicks);
        }
        target.addEventListener('click', disableClicks, { once: true });
        return target;
      });
      setTool(null);
    } else {
      setCurrent(null);
    }
  }, []);

  const trackClickWhenClicked = useCallback((event: MouseEvent) => {
    // We don't want clicks to actually happen.
    const target = event.target as HTMLElement;
    for (const element of document.querySelectorAll('.exclude-tracking')) {
      if (element.contains(target)) {
        return;
      }
    }

    setStatus({
      status: Status.inspecting
    });
    setCurrent(target);
    setTool(null);
  }, []);

  const trackClickWhenInspecting = useCallback((event: MouseEvent) => {
    // We don't want clicks to actually happen.
    const target = event.target as HTMLElement;
    for (const element of document.querySelectorAll('.exclude-tracking')) {
      if (element.contains(target)) {
        return;
      }
    }

    if (target) {
      setCurrent(target);
      setStatus({
        status: Status.selected,
        mouseX: event.clientX,
        mouseY: event.clientY,
      });
      setTool(null);
    }
  }, []);

  useEffect(() => {
    switch (state.status) {
      case Status.idle:
        document.removeEventListener('mouseover', trackElements);
        document.removeEventListener('mouseup', trackClickWhenInspecting);
        document.removeEventListener('mouseup', trackClickWhenClicked);
        document.removeEventListener('click', disableClicks);
        break;
      case Status.inspecting:
        document.addEventListener('mouseover', trackElements);
        document.addEventListener('mouseup', trackClickWhenInspecting);
        document.removeEventListener('mouseup', trackClickWhenClicked);
        document.addEventListener('click', disableClicks);
        break;
      case Status.selected:
        if (tool === Tool.Edit) {
          // If we're editing an element, we don't want to select anything
          // until we're done.
          document.removeEventListener('mouseover', trackElements);
          document.removeEventListener('mouseup', trackClickWhenInspecting);
          document.removeEventListener('mouseup', trackClickWhenClicked);
          document.removeEventListener('click', disableClicks);
        } else {
          document.removeEventListener('mouseover', trackElements);
          document.removeEventListener('mouseup', trackClickWhenInspecting);
          document.addEventListener('mouseup', trackClickWhenClicked);
          document.removeEventListener('click', disableClicks);
        }
        break;
    }
    return () => {
      document.removeEventListener('mouseover', trackElements);
      document.removeEventListener('mouseup', trackClickWhenInspecting);
      document.removeEventListener('mouseup', trackClickWhenClicked);
    }
  }, [state, tool]);

  return (
    <div className="fixed top-0 right-[96px] exclude-tracking z-[5000]">
      <button
        className={`p-1 w-[32px] h-[40px] ${state.status === Status.inspecting ? 'bg-primary text-secondary' : 'bg-rose text-primary hover:bg-secondary'}`}
        onClick={() => {
          setStatus(state.status === Status.idle ? { status: Status.inspecting } : { status: Status.idle });
        }}
      >
        <FontAwesomeIcon icon={faScissors} />
      </button>
      <DomCanvas element={current} state={state} tool={tool} setTool={setTool} />
    </div>

  )
}

function DomCanvas({ element, state, tool, setTool }: {
  element: HTMLElement | null,
  state: State,
  tool: Tool | null,
  setTool: (tool: Tool) => void,
}) {

  if (!element || state.status === Status.idle) {
    return null;
  }

  // Draw a rect for every rect in the box model
  // # The CSS box model
  // > https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Box_Model/Introduction_to_the_CSS_box_model
  //
  // ------------------------------------
  // |              MARGIN              |  (marginBox)
  // |  ------------------------------  |
  // |  |           BORDER           |  |  (borderBox)
  // |  |  ------------------------  |  |
  // |  |  |       PADDING        |  |  |  (paddingBox) - not used by anything really
  // |  |  |  ------------------  |  |  |
  // |  |  |  |    CONTENT     |  |  |  |  (contentBox)
  // |  |  |  |                |  |  |  |
  // |  |  |  |                |  |  |  |
  // |  |  |  |                |  |  |  |
  // |  |  |  ------------------  |  |  |
  // |  |  |                      |  |  |
  // |  |  ------------------------  |  |
  // |  |                            |  |
  // |  ------------------------------  |
  // |                                  |
  // | ----------------------------------|

  const box = getBox(element);
  const toolData = tools.find((toolData) => toolData.name === tool);
  const shouldShowBoundingBox = toolData ? toolData.shouldShowBoundingBox : true;

  return (
    <>
      {shouldShowBoundingBox && (
        <>
          <div
            className="fixed border-2 border-primary exclude-tracking pointer-events-none z-50"
            style={{
              top: box.marginBox.top,
              left: box.marginBox.left,
              width: box.marginBox.width,
              height: box.marginBox.height,
            }}
          />
          <div
            className="fixed border-2 border-tertiary exclude-tracking pointer-events-none z-50"
            style={{
              top: box.paddingBox.top,
              left: box.paddingBox.left,
              width: box.paddingBox.width,
              height: box.paddingBox.height,
            }}
          />
          <div
            className="fixed border-2 border-rose exclude-tracking pointer-events-none z-50"
            style={{
              top: box.contentBox.top,
              left: box.contentBox.left,
              width: box.contentBox.width,
              height: box.contentBox.height,
            }}
          />
        </>
      )}
      <Toolbar
        element={element} state={state}
        tool={toolData}
        setTool={setTool}
      />
    </>
  )
}


enum Tool {
  CSS = 'Update CSS',
  Edit = 'Edit Text',
  Locate = 'Locate',
  Link = 'Update Link',
  Magic = 'Magic',
};

type ToolData = {
  name: Tool,
  icon: IconDefinition,
  shouldShow: (args: {
    element: HTMLElement,
    location?: Location,
  }) => boolean,
  shouldShowBoundingBox: boolean,
};


const tools: ToolData[] = [
  {
    name: Tool.Magic,
    icon: faMagicWandSparkles,
    shouldShow: ({ element }) => {
      return true;
    },
    shouldShowBoundingBox: true,
  },
  {
    name: Tool.CSS,
    icon: faAlignJustify,
    shouldShow: ({ element, location }) => {
      return location?.type === 'self';
    },
    shouldShowBoundingBox: true,
  },
  {
    name: Tool.Edit,
    icon: faPencil,
    shouldShow: ({ element }) => {
      const tagName = element.tagName.toLowerCase();
      const hasOnlyText = element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE;
      return hasOnlyText &&
        (['p', 'div', 'span'].includes(tagName) || tagName.startsWith('h') || tagName.startsWith('a'));
    },
    shouldShowBoundingBox: false,
  },
  {
    name: Tool.Locate,
    icon: faEye,
    shouldShow: ({ location }) => {
      return location?.type === 'self';
    },
    shouldShowBoundingBox: false,
  },
  {
    name: Tool.Link,
    icon: faLink,
    shouldShow: ({ element }) => {
      return element.tagName.toLowerCase() === 'a';
    },
    shouldShowBoundingBox: false,
  },
];

type Location = {
  type: 'self',
  filePath: string,
  lineNumber: number,
} | {
  type: 'parent',
  filePath: string,
  lineNumber: number,
};

function getLocation(element: HTMLElement | undefined): undefined | Location {
  if (!element) {
    return;
  }
  const filePath = element.dataset.astroSourceFile?.split('/').slice(3).join('/');
  const [_lineNumber, _] = element.dataset.astroSourceLoc?.split(':') ?? ['', ''];
  const lineNumber = parseInt(_lineNumber);
  if (filePath && lineNumber) {
    return {
      type: 'self',
      filePath,
      lineNumber,
    }
  } else {
    const parentLoc = getLocation(element.parentElement);
    if (!parentLoc) {
      return;
    }
    const { filePath, lineNumber } = parentLoc;
    if (filePath && lineNumber) {
      return {
        type: 'parent',
        filePath,
        lineNumber,
      }
    }
  }
}

function Toolbar({
  element,
  state,
  tool,
  setTool,
}: {
  element: HTMLElement,
  state: State
  tool: ToolData | null | undefined,
  setTool: (tool: Tool) => void,
}) {

  const width = 250; // px
  const height = 250; // px
  let top, left, right, bottom;

  const { x: mouseX, y: mouseY } = useMousePosition();
  const pointerEvents = state.status === Status.inspecting ? 'none' : 'auto';

  const location = getLocation(element);

  const isSelected = state.status === Status.selected;
  const screenWidth = window.innerWidth;


  if (isSelected) {
    // top = state.mouseY > height ? state.mouseY - height : state.mouseY;
    // right = state.mouseX > screenWidth - width ? screenWidth - state.mouseX : screenWidth - width - state.mouseX;
    const boundingRect = element.getBoundingClientRect();
    left = boundingRect.right > width ? boundingRect.right - width : boundingRect.right;
    top = boundingRect.top > height ? boundingRect.top - height : boundingRect.bottom;
  } else {
    top = mouseY > height ? mouseY - height : mouseY;
    right = mouseX > screenWidth - width ? screenWidth - mouseX : screenWidth - width - mouseX;
  }

  const [showTooltipForIndex, setShowTooltipForIndex] = useState<number | null>(null);


  return (
    <div
      className={`fixed bg-secondary pointer-events-${pointerEvents} z-[5000] border border-buff overflow-auto`}
      style={{
        top,
        right,
        left,
        bottom,
        width,
        height,
      }}
    >
      <div className="p-4">
        <h2 className="text-rose font-bold mb-2">
          {element.tagName.toLowerCase()}
        </h2>
        <div className="flex text-sm gap-2 align-middle mb-3">
          {tools.map((toolData, i) => {
            if (toolData.shouldShow({ element, location })) {
              return (
                <div
                  key={i}
                >
                  <button
                    className={`p-1 rounded ${isSelected && tool?.name === toolData.name ? 'bg-primary text-secondary' : 'bg-secondary text-primary'}`}
                    onClick={() => setTool(toolData.name)}
                    onMouseEnter={() => {
                      setShowTooltipForIndex(i);
                    }}
                    onMouseLeave={() => {
                      setShowTooltipForIndex(null);
                    }}
                  >

                    <FontAwesomeIcon icon={toolData.icon} />
                  </button>
                  {/* Hover tooltip above button */}
                  {showTooltipForIndex === i && (
                    <div className="absolute bg-secondary text-primary p-2 rounded text-xs top-[75px]">
                      {toolData.name}
                    </div>
                  )}
                </div>
              )
            }
          })}
        </div>
        {tool && isSelected ? <ToolDisplay tool={tool?.name} element={element} location={location}
          setTool={setTool} /> : null}
      </div>
    </div>
  )
}

function ToolDisplay({
  tool,
  element,
  location,
  setTool,
}: {
  tool: Tool,
  element: HTMLElement,
  location: Location | undefined,
  setTool: (tool: Tool) => void,
}) {
  switch (tool) {
    case Tool.CSS:
      return <ClassList element={element} filePath={location.filePath} lineNumber={location.lineNumber} />;
    case Tool.Edit:
      return <EditElement element={element} setTool={setTool} location={location} />
    case Tool.Locate:
      return <Locate location={location} />
    case Tool.Link:
      return <LinkUpdate element={element} location={location} />
    case Tool.Magic:
      return <Magic element={element} location={location} />
    default:
      let _exhaustiveCheck: never = tool;
      return _exhaustiveCheck;
  }
}

function Magic({
  element,
  location,
}: {
  element: HTMLElement,
  location: Location | undefined,
}) {
  const [userAction, setUserAction] = useState('');
  return (
    <>
      <div className="flex gap-2 text-xs">
        <input type="text" className="w-full bg-buff p-1 rounded" placeholder="Make this darker.." value={userAction} onChange={(e) => setUserAction(e.target.value)} />
        <button className="bg-buff text-secondary p-1 rounded disabled:bg-gray-50 hover:bg-rose text-xs"
          disabled={!userAction}
          onClick={async () => {
            const edit /* Edit */ = {
              type: 'precise',
              action: userAction,
              filePath: location.filePath,
              lineNumber: location.lineNumber,
            };
            parent.postMessage({
              type: 'apiCall',
              url: window.location.href,
              body: {
                edit,
              },
              headers: {
                'Content-Type': 'application/json',
              },
            }, '*');
          }}
        >Perform</button>
      </div>
    </>
  )
}



function LinkUpdate({
  element,
  location,
}: {
  element: HTMLElement,
  location: Location | undefined,
}) {
  const [newHref, setNewHref] = useState(element instanceof HTMLAnchorElement ? element.href : '');
  const [oldHref, _] = useState(element instanceof HTMLAnchorElement ? element.href : '');
  return (
    <div className="flex gap-2 text-xs">
      <input type="text" className="w-full bg-buff p-1 rounded" placeholder="New href" value={newHref} onChange={(e) => setNewHref(e.target.value)} />
      <button className="bg-rose text-secondary p-1 rounded disabled:bg-gray-50"
        disabled={!newHref}
        onClick={async () => {
          const edit /* Edit */ = {
            type: 'precise',
            action: `Update link ${oldHref} to ${newHref}`,
            filePath: location.filePath,
            lineNumber: location.lineNumber,
          };
          parent.postMessage({
            type: 'apiCall',
            url: window.location.href,
            body: {
              edit,
            },
            headers: {
              'Content-Type': 'application/json',
            },
          }, '*');
        }}
      >Update</button>
    </div>
  )
}


function Locate({ location }: { location: Location }) {
  useEffect(() => {
    parent.postMessage({
      type: 'locate',
      location,
    }, '*');
  }, []);
  return (
    <div className="text-xs text-primary">Location: {location.filePath}:{location.lineNumber}</div>
  )
}

function EditElement({
  element,
  setTool,
  location,
}: {
  element: HTMLElement
  setTool: (tool: Tool) => void
  location: Location
}) {
  let initialText = useRef<string | null>(null);

  useEffect(() => {
    element.contentEditable = 'true';
    // set contenteditable to false on all children
    for (const child of element.querySelectorAll('*')) {
      (child as HTMLElement).contentEditable = 'false';
    }
    element.focus();

    // TODO: we only want to get text content, not HTML content. Restrict it to
    // the parent only somehow? Gets weird.
    initialText.current = element.textContent;
    return () => {
      element.contentEditable = 'false';
    }
  }, []);

  return (
    <div>
      <div className="flex gap-2">
        <button
          className="bg-rose text-secondary p-1 rounded text-sm hover:bg-buff"
          onClick={() => {
            element.contentEditable = 'false';
            setTool(null);
            const edit: any /* Edit */ = {
              type: location.type === 'self' ? 'precise' : 'imprecise',
              action: `Edit text from ${initialText.current} to ${element.textContent}`,
            };
            if (location.type === 'self') {
              edit.filePath = location.filePath;
              edit.lineNumber = location.lineNumber;
            } else {
              edit.preciseParent = {
                filePath: location.filePath,
                lineNumber: location.lineNumber,
              }
            }

            parent.postMessage({
              type: 'apiCall',
              url: window.location.href,
              body: {
                edit,
              },
              headers: {
                'Content-Type': 'application/json',
              },
            }, '*');
          }}
        >
          <FontAwesomeIcon icon={faCheckCircle} />
        </button>
        <button
          className="bg-rose text-secondary p-1 rounded text-sm hover:bg-buff"
          onClick={() => {
            element.contentEditable = 'false';
            if (initialText.current) {
              element.textContent = initialText.current;
            }
            setTool(null);
          }}
        >
          <FontAwesomeIcon icon={faXmarkCircle} />
        </button>
      </div>
      <span className="text-sm">
        Start typing!
      </span>
    </div>
  )
}

function ClassList({
  element,
  filePath,
  lineNumber,
}: {
  element: HTMLElement
  filePath: string
  lineNumber: number
}) {
  const [newClassName, setNewClassName] = useState('');
  return (
    <>
      <div className="flex text-secondary text-xs flex-wrap">
        {
          Array.from(element.classList.values()).map((className, i) => (
            <div
              className="bg-buff mr-2 mb-2 p-1 rounded"
              key={i}>
              {className}
            </div>
          ))
        }
      </div>
      {filePath && lineNumber && <div className="flex gap-2 mb-2 text-xs">
        <input type="text" className="w-full bg-buff p-1 rounded" placeholder="New class name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
        <button className="bg-rose text-secondary p-1 rounded disabled:bg-gray-50"
          disabled={!newClassName}
          onClick={async () => {
            const edit /* Edit */ = {
              type: 'precise',
              action: `Add class ${newClassName}`,
              filePath,
              lineNumber,
            };
            parent.postMessage({
              type: 'apiCall',
              url: window.location.href,
              body: {
                edit,
              },
              headers: {
                'Content-Type': 'application/json',
              },
            }, '*');
          }}
        >Add</button>
      </div>}
    </>
  )
}

export default Canvas;

