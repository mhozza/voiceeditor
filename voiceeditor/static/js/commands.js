var selecting = false;
var select_direction = 0;
var clip;

function _alert(what, input_class) {
    if (input_class === undefined) input_class = 'alert-success'
    $("#voice_input_box").append(
        $('<div class="alert alert-block ' + input_class + '"><button type="button" class="close" data-dismiss="alert">&times;</button>'+what+'</div>')
    );
}

function _load(what) {
    lines = what.split("\n");
    lines_start = [];
    lines_end = [];
    current_line_start = "";
    current_line_end = "";
    for (var i = 0; i < lines.length - 1; i++)
        lines_start.push(lines[i]);
    current_line_start = lines[lines.length-1];
    refresh_editor();
}

function get_all() {
    var lines = [];
    for (var line in lines_start) lines.push(lines_start[line]);
    lines.push(current_line_start + current_line_end);
    for (var line in lines_end) lines.push(lines_end[line]);
    return lines.join('\n');
}

function save() {
    var all = get_all();
    console.log("Command: save");
    var url = "/api/save/";
    jQuery.post(url, {'task_id': window.task, 'content': all}, function(result) {
        console.log(result);
    });
}

function load() {
    var url = "/api/load/";
    jQuery.post(url, {'task_id': window.task}, function(result) {
        _load(result);
    });
}

function submit() {
    var all = get_all();
    if (all == "") return;
    console.log("Command: submit");
    var url = "/submit/" + window.task + "/";
    jQuery.post(url, {'data': all, 'language': '.cc'}, function(result) {
        console.log(result);
        // begin result polling, then alert the result
        var have_result = false;
        var testurl = '/submit/test/'
        _alert("Submit successful!", "alert-info");
        var testfunc = function() {
            console.log('checking for result');
            jQuery.post(testurl, {'submit_id': result['id']}, function(res) {
                if (res['status'] === 'finished') {
                    have_result = true;
                    if (res['result'] == 'CERR')
                        _alert("Compilation error: " + "\n" + res['msg'], "alert-danger");
                    else {
                        if (res['result'] == 'OK') {
                            _alert("Result: " + res['result'], "alert-success");
                        } else {
                            _alert("Result: " + res['result'], "alert-warning");
                        }
                    }
                } else {
                    setTimeout(testfunc, 1000);
                }
            });
        };
        setTimeout(testfunc, 1000);
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

function start_selection() {
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

function copy() {
    clip = [];
    for (var i in lines_start) {
        if (window.selection!=null && i >= window.selection.line_start && i <= window.selection.line_end) {
            var first_line = (i == window.selection.line_start);
            var last_line = (i == window.selection.line_end);
            sel = create_line_selection(window.selection, first_line, last_line, lines_start[i].length, 0);
            clip.push(lines_start[i].substring(sel.start, sel.end));
        }
    }

    if (window.selection != null && lines_start.length >= window.selection.line_start && lines_start.length <= window.selection.line_end) {
        var first_line = (lines_start.length == window.selection.line_start);
        var last_line = (lines_start.length == window.selection.line_end);
        sel2 = create_line_selection(window.selection, first_line, last_line, window.current_line_end.length, window.current_line_start.length);
        sel1 = create_line_selection(window.selection, first_line, last_line, window.current_line_start.length, 0);
        clip.push(window.current_line_start.substring(sel1.start, sel1.end) + window.current_line_end.substring(sel2.start, sel2.end));
    }

    for (var i in lines_end) {
        if (window.selection!=null && i + lines_start.length + 1 >= window.selection.line_start && i + lines_start.length + 1 <= window.selection.line_end) {
            var first_line = (i + lines_start.length + 1 == window.selection.line_start);
            var last_line = (i + lines_start.length + 1 == window.selection.line_end);
            sel = create_line_selection(window.selection, first_line, last_line, lines_end[i].length, 0);
            clip.push(lines_end[i].substring(sel.start, sel.end));
        }
    }

    console.log(window.clip);
}

function cut() {
    copy();
    delete_selection();
}

function paste() {
    delete_selection();
    if (clip.length>0) {
        var t = clip[0];
        clip[0] = current_line_start + clip[0];
        for (var i = 0; i<clip.length-1; i++) {
            lines_start.push(clip[i]);
        }
        current_line_start = clip[clip.length-1];
        clip[0] = t;
    }
    refresh_editor();
}

function set_programming_language(lang) {
    editor = $('#editor');
    if (lang.trim().toLowerCase()[0] == 'p') {
        editor.removeClass('language-cpp');
        editor.addClass('language-delphi');
        editor_lang = 'pas';
    } else {
        editor.removeClass('language-delphi');
        editor.addClass('language-cpp');
        editor_lang = 'cpp';
    }
    refresh_editor();
}

function set_language(lang) {
    if (lang.trim().toLowerCase()[0] == 's') {
        recognition.stop();
        recognition.lang = 'sk-SK';
        recognition.start();

    } else {
        recognition.stop();
        recognition.lang = 'en-US';
        recognition.start();
    }
    refresh_editor();
}
