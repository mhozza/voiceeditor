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
    position = current_line_start.length;
    lines_end.unshift(current_line_start + current_line_end);
    current_line_start = lines_start[0].substring(0, position);
    current_line_end = lines_start[0].substring(position);
    lines_start.pop();
    refresh_editor();
}

function down() {
    if (lines_end.length == 0) return;
    position = current_line_start.length;
    lines_start.push(current_line_start + current_line_end);
    current_line_start = lines_end[0].substring(0, position);
    current_line_end = lines_end[0].substring(position);
    lines_end.shift();
    refresh_editor();
}

function newline() {
    lines_start.push(current_line_start);
    current_line_start = '';
    refresh_editor();
}

function backspace() {
    if (current_line_start.length > 0) {
        current_line_start = current_line_start.slice(0, -1);
    } else {
        if (lines_start.length > 0) {
            current_line_start = lines_start[0] + current_line_start;
            lines_start.pop();
        }
    }
    refresh_editor();
}

function del() {
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
    current_line_end = current_line_start + current_line_end;
    current_line_start = '';
    refresh_editor();
}

function end() {
    current_line_start = current_line_start + current_line_end;
    current_line_end = '';
    refresh_editor();
}
