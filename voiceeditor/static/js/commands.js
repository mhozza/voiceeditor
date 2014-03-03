var selecting = false;
var select_direction = 0;

function submit() {
    var all = lines_start.join('\n') + '\n' + current_line_start + current_line_end + '\n' + lines_end.join('\n')
    console.log("Command: submit");
    var url = "/submit/" + window.task + "/"
    jQuery.post(url, {'data': all, 'language': '.cc'}, function(result) {
        console.log(result);
    });
}

function left() {
    if (current_line_start.length > 0) {
        if(selection!= null && selecting) {
            if (window.selection.line_start == lines_start.length &&  window.selection.start == current_line_start.length) {
                window.selection.start -= 1;
                select_direction = -1;
            } else if (window.selection.line_end == lines_start.length &&  window.selection.end == current_line_start.length) {
                window.selection.end -= 1;
            }
        }
        current_line_end = current_line_start.slice(-1) + current_line_end;
        current_line_start = current_line_start.slice(0, -1);
    } else {
        up();
        end();
    }
    refresh_editor();
}

function right() {
    if (current_line_end.length > 0) {
        if(selection!= null && selecting) {
            if (selection.line_end == lines_start.length &&  selection.end == current_line_start.length) {
                selection.end += 1;
                select_direction = 1;
            } else if (selection.line_start == lines_start.length &&  selection.start == current_line_start.length) {
                selection.start += 1;
            }
        }
        current_line_start+=current_line_end[0];
        current_line_end = current_line_end.substring(1);
    } else {
        down();
        home();
    }
    refresh_editor();
}

function up() {
    if (lines_start.length == 0) return;
    if(selection!= null && selecting) {
        if (window.selection.line_start == lines_start.length) {
            window.selection.line_start -= 1;
            if (select_direction == 1) {
                var t = selection.end;
                selection.end = selection.start;
                selection.start = t;
                select_direction = -1;
            }
        } else if (window.selection.line_end == lines_start.length) {
            window.selection.line_end -= 1;
            if (window.selection.line_start == window.selection.line_start && window.selection.start > window.selection.end) {
                var t = selection.end;
                selection.end = selection.start;
                selection.start = t;
                select_direction = -1;
            }
        }
    }
    position = current_line_start.length;
    lines_end.unshift(current_line_start + current_line_end);
    current_line_start = lines_start[lines_start.length-1].substring(0, position);
    current_line_end = lines_start[lines_start.length-1].substring(position);
    lines_start.pop();
    refresh_editor();
}

function down() {
    if (lines_end.length == 0) return;
    if(selection!= null && selecting) {
        if (window.selection.line_end == lines_start.length) {
            window.selection.line_end += 1;
            if (select_direction == -1) {
                var t = selection.end;
                selection.end = selection.start;
                selection.start = t;
                select_direction = 1;
            }
        } else if (window.selection.line_start == lines_start.length) {
            window.selection.line_start += 1;
            if (window.selection.line_start == window.selection.line_start && window.selection.start > window.selection.end) {
                var t = selection.end;
                selection.end = selection.start;
                selection.start = t;
                select_direction = 1;
            }
        }
    }
    position = current_line_start.length;
    lines_start.push(current_line_start + current_line_end);
    current_line_start = lines_end[0].substring(0, position);
    current_line_end = lines_end[0].substring(position);
    lines_end.shift();
    refresh_editor();
}

function newline() {
    delete_selection();
    lines_start.push(current_line_start);
    current_line_start = '';
    refresh_editor();
}

function backspace() {
    if (selection == null) {
        if (current_line_start.length > 0) {
            current_line_start = current_line_start.slice(0, -1);
        } else {
            if (lines_start.length > 0) {
                current_line_start = lines_start[lines_start.length-1] + current_line_start;
                lines_start.pop();
            }
        }
    } else {
        delete_selection();
    }
    refresh_editor();
}

function del() {
    if (selection != null) {
        delete_selection();
        refresh_editor();
        return;
    }
    if (current_line_end.length > 0) {
        current_line_end = current_line_end.substring(1);
    } else {
        if (lines_end.length > 0) {
            current_line_end += lines_end[0];
            lines_end.shift();
        }
    }
    refresh_editor();
}

function home() {
    if(selection!= null && selecting) {
        if (window.selection.line_start == lines_start.length) {
            if (select_direction == 1) {
                window.selection.end = window.selection.start;
                select_direction = -1;
            }
            window.selection.start = 0;
        } else if (window.selection.line_end == lines_start.length) {
            window.selection.end = 0;
        }
    }
    current_line_end = current_line_start + current_line_end;
    current_line_start = '';
    refresh_editor();
}

function end() {
    if(window.selection!= null && selecting) {
        if (window.selection.line_end == lines_start.length) {
            if (select_direction == -1) {
                window.selection.start = window.selection.end;
                select_direction = 1;
            }
            window.selection.end = current_line_start.length + current_line_end.length;
        } else if (window.selection.line_start == lines_start.length) {
            window.selection.start = current_line_start.length + current_line_end.length;
        }
    }
    current_line_start = current_line_start + current_line_end;
    current_line_end = '';
    refresh_editor();
}

function multi(what, count) {
    count = Number(count);
    var fname = null;
    for (var i in window.commands) {
        if (window.commands[i].fields.words == what) {
            fname = window.commands[i].fields.command.fields.function;
            break;
        }
    }
    if (fname != null) {
        for (var i=0; i<count; i++) {
            eval(fname + '()');
        }
    }
}

function select() {
    if (!selecting) {
        window.selection = {
            'start': current_line_start.length,
            'end': current_line_start.length,
            'line_start': lines_start.length,
            'line_end': lines_start.length
        }
    }
    window.selecting = true;
    refresh_editor();
}

function deselect() {
    window.selection = null;
    window.selecting = false;
    refresh_editor();
}

function select_line() {
    end();
    select_direction = 1;
    window.selection = {
        'start': 0,
        'end': current_line_start.length + current_line_end.length,
        'line_start': lines_start.length,
        'line_end': lines_start.length
    }
    window.selecting = true;
    refresh_editor();
}

function select_all() {
    goto_end();
    window.selection = {
        'start': 0,
        'end': current_line_start.length + current_line_end.length,
        'line_start': 0,
        'line_end': lines_start.length + lines_end.length
    }
    window.selecting = true;
    refresh_editor();
}

function goto_end() {
    if (lines_end.length>0) {
        lines_start.push(current_line_start + current_line_end);
        for (var i = 0; i<lines_end.length-1; i++) {
            lines_start.push(lines_end[i]);
        }
        current_line_start = lines_end[lines_end.length-1];
        current_line_end = '';
        lines_end = [];
    } else {
        end();
    }
}

// function goto_begin() {
//     lines_start.push(current_line_start + current_line_end);
//     if (lines_end.length>0) {
//         for (var i = 0; i<lines_end.length-1; i++) {
//             lines_start.push(lines_end[i]);
//         }
//         current_line_start = lines_end[lines_end.length-1];
//         current_line_end = '';
//     } else {
//         end();
//     }
// }
